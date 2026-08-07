import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseDataParam, parsePageParam } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const de           = parseDataParam(searchParams.get("de"),  "inicio");
  const ate          = parseDataParam(searchParams.get("ate"), "fim");
  const tipo         = searchParams.get("tipo");
  const fornecedorId = searchParams.get("fornecedorId");
  // Usado pela exportação de CSV — traz tudo que bate com o filtro, não só a página atual.
  const exportar     = searchParams.get("exportar") === "true";
  const page         = parsePageParam(searchParams.get("page"));
  const limit        = 50;

  const where: Record<string, unknown> = { empresaId: session.empresaId };
  if (tipo && tipo !== "todos") where.tipo = tipo;
  if (fornecedorId) where.produto = { fornecedorId };
  if (de || ate) {
    where.criadoEm = {};
    if (de)  (where.criadoEm as Record<string, unknown>).gte = de;
    if (ate) (where.criadoEm as Record<string, unknown>).lte = ate;
  }

  const [total, movimentacoes] = await Promise.all([
    db.movimentacao.count({ where }),
    db.movimentacao.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      ...(exportar ? {} : { skip: (page - 1) * limit, take: limit }),
      include: { produto: { select: { nome: true, unidade: true } } },
    }),
  ]);

  return NextResponse.json({ total, paginas: Math.ceil(total / limit), movimentacoes });
}
