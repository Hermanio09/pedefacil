import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const mes = searchParams.get("mes");

  const agora  = new Date();
  const anoMes = mes ?? `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  const [ano, m] = anoMes.split("-").map(Number);
  const inicioMes = new Date(ano, m - 1, 1);
  const fimMes    = new Date(ano, m, 0, 23, 59, 59);

  const produtos = await db.produto.findMany({
    where:  { empresaId: session.empresaId },
    select: { id: true, nome: true, unidade: true, estoqueAtual: true, precoUnitario: true },
  });

  const valorEstoque = produtos.reduce((acc, p) => acc + p.estoqueAtual * p.precoUnitario, 0);

  const entradasMes = await db.movimentacao.findMany({
    where:   { empresaId: session.empresaId, tipo: "entrada", criadoEm: { gte: inicioMes, lte: fimMes }, revertida: false },
    include: { produto: { select: { nome: true, unidade: true } } },
  });

  const custoMes = entradasMes.reduce((acc, m) => acc + m.quantidade * m.precoUnitario, 0);

  const saidasMes = await db.movimentacao.findMany({
    where:   { empresaId: session.empresaId, tipo: "saida", criadoEm: { gte: inicioMes, lte: fimMes }, revertida: false },
    include: { produto: { select: { nome: true, unidade: true } } },
  });

  const consumoMap = new Map<string, { nome: string; unidade: string; quantidade: number; custo: number }>();
  for (const s of saidasMes) {
    const preco = produtos.find((p) => p.id === s.produtoId)?.precoUnitario ?? 0;
    const entry = consumoMap.get(s.produtoId);
    if (entry) { entry.quantidade += s.quantidade; entry.custo += s.quantidade * preco; }
    else consumoMap.set(s.produtoId, { nome: s.produto.nome, unidade: s.produto.unidade, quantidade: s.quantidade, custo: s.quantidade * preco });
  }
  const topConsumo = Array.from(consumoMap.values()).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);

  const estoqueDetalhado = produtos
    .filter((p) => p.precoUnitario > 0)
    .sort((a, b) => (b.estoqueAtual * b.precoUnitario) - (a.estoqueAtual * a.precoUnitario))
    .map((p) => ({ ...p, valorTotal: p.estoqueAtual * p.precoUnitario }));

  return NextResponse.json({ mes: anoMes, valorEstoque, custoMes, topConsumo, estoqueDetalhado, entradasMes: entradasMes.length });
}
