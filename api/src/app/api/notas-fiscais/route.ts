import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseDataParam } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const de         = parseDataParam(searchParams.get("de"),  "inicio");
  const ate        = parseDataParam(searchParams.get("ate"), "fim");
  const fornecedor = searchParams.get("fornecedor")?.trim();
  const tipo       = searchParams.get("tipo");

  const where: Record<string, unknown> = { empresaId: session.empresaId };

  if (de || ate) {
    const criadoEm: Record<string, Date> = {};
    if (de)  criadoEm.gte = de;
    if (ate) criadoEm.lte = ate;
    where.criadoEm = criadoEm;
  }
  if (fornecedor) {
    where.fornecedorNome = { contains: fornecedor, mode: "insensitive" };
  }
  if (tipo && tipo !== "todos") {
    where.tipo = tipo;
  }

  const notas = await db.notaFiscal.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    include: {
      usuario:  { select: { nome: true } },
      arquivos: { select: { id: true, nome: true, mimeType: true, ordem: true } },
    },
  });

  return NextResponse.json(notas);
}
