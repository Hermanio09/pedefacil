import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const produtos = await db.produto.findMany({
    where:   { empresaId: session.empresaId },
    include: { fornecedor: { select: { nome: true } } },
    orderBy: { nome: "asc" },
  });

  const itens = produtos.map((p) => ({
    id:           p.id,
    nome:         p.nome,
    unidade:      p.unidade,
    estoqueAtual: p.estoqueAtual,
    estoqueMinimo: p.estoqueMinimo,
    precoUnitario: p.precoUnitario,
    valorTotal:   p.estoqueAtual * p.precoUnitario,
    fornecedor:   p.fornecedor?.nome ?? "—",
    status:       p.estoqueAtual <= 0 ? "zerado" : p.estoqueAtual <= p.estoqueMinimo ? "baixo" : "ok",
  }));

  const totalValor  = itens.reduce((acc, p) => acc + p.valorTotal, 0);
  const totalItens  = itens.length;
  const totalUnidades = itens.reduce((acc, p) => acc + p.estoqueAtual, 0);
  const emAlerta    = itens.filter((p) => p.status !== "ok").length;

  return NextResponse.json({
    geradoEm:    new Date().toISOString(),
    totalValor,
    totalItens,
    totalUnidades,
    emAlerta,
    itens,
  });
}
