import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [produtos, movsHoje] = await Promise.all([
    db.produto.findMany({ where: { empresaId: session.empresaId } }),
    db.movimentacao.findMany({ where: { empresaId: session.empresaId, criadoEm: { gte: hoje } } }),
  ]);

  return NextResponse.json({
    totalProdutos:    produtos.length,
    produtosEmAlerta: produtos.filter((p) => p.estoqueAtual <= p.estoqueMinimo).length,
    entradasHoje:     movsHoje.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.quantidade, 0),
    saidasHoje:       movsHoje.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.quantidade, 0),
  });
}
