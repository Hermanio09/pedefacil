import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const de  = searchParams.get("de");
  const ate = searchParams.get("ate");

  const inicio = de  ? new Date(de  + "T00:00:00") : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fim    = ate ? new Date(ate + "T23:59:59") : new Date();

  const saidas = await db.movimentacao.findMany({
    where: {
      empresaId: session.empresaId,
      revertida: false,
      criadoEm:  { gte: inicio, lte: fim },
      // "ajuste" pode ir em qualquer direção — só conta como consumo quando de fato tirou
      // estoque (uma contagem de fechamento que ACRESCENTA estoque não é consumo).
      OR: [
        { tipo: "saida" },
        { tipo: "ajuste", estoquePositivo: false },
      ],
    },
    include: {
      produto: { select: { nome: true, unidade: true, precoUnitario: true } },
    },
  });

  const prodMap = new Map<string, { nome: string; unidade: string; quantidade: number; custo: number }>();

  for (const s of saidas) {
    const preco = s.produto.precoUnitario;
    if (!prodMap.has(s.produtoId)) {
      prodMap.set(s.produtoId, { nome: s.produto.nome, unidade: s.produto.unidade, quantidade: 0, custo: 0 });
    }
    const entry = prodMap.get(s.produtoId)!;
    entry.quantidade += s.quantidade;
    entry.custo      += s.quantidade * preco;
  }

  const produtos = Array.from(prodMap.values())
    .sort((a, b) => b.quantidade - a.quantidade);

  const totalQtd   = produtos.reduce((acc, p) => acc + p.quantidade, 0);
  const totalCusto = produtos.reduce((acc, p) => acc + p.custo, 0);

  return NextResponse.json({
    de:         inicio.toISOString().slice(0, 10),
    ate:        fim.toISOString().slice(0, 10),
    totalQtd,
    totalCusto,
    produtos,
  });
}
