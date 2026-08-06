import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const de    = searchParams.get("de");
  const ate   = searchParams.get("ate");
  const tipo  = searchParams.get("tipo");
  const page  = Number(searchParams.get("page") ?? 1);
  const limit = 50;

  const where: Record<string, unknown> = { empresaId: session.empresaId };
  if (tipo && tipo !== "todos") where.tipo = tipo;
  if (de || ate) {
    where.criadoEm = {};
    if (de)  (where.criadoEm as Record<string, unknown>).gte = new Date(de  + "T00:00:00");
    if (ate) (where.criadoEm as Record<string, unknown>).lte = new Date(ate + "T23:59:59");
  }

  const [total, movimentacoes] = await Promise.all([
    db.movimentacao.count({ where }),
    db.movimentacao.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      include: { produto: { select: { nome: true, unidade: true } } },
    }),
  ]);

  return NextResponse.json({ total, paginas: Math.ceil(total / limit), movimentacoes });
}
