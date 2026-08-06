import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  const produtos = await db.produto.findMany({
    where:  { fornecedorId: id, empresaId: session.empresaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, unidade: true, estoqueAtual: true, estoqueMinimo: true },
  });
  return NextResponse.json(produtos);
}
