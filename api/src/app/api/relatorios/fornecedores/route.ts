import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseDataParam } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { searchParams } = req.nextUrl;

  const inicio = parseDataParam(searchParams.get("de"),  "inicio") ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fim    = parseDataParam(searchParams.get("ate"), "fim")    ?? new Date();

  const entradas = await db.movimentacao.findMany({
    where: {
      empresaId: session.empresaId,
      tipo:      "entrada",
      criadoEm:  { gte: inicio, lte: fim },
      revertida: false,
    },
    include: {
      produto: {
        select: { nome: true, unidade: true, precoUnitario: true, fornecedor: { select: { id: true, nome: true } } },
      },
    },
    orderBy: { criadoEm: "desc" },
  });

  const fornMap = new Map<string, {
    nome:       string;
    totalGasto: number;
    totalItens: number;
    entradas:   { data: Date; produto: string; unidade: string; quantidade: number; custo: number }[];
  }>();

  for (const e of entradas) {
    const forn    = e.produto.fornecedor;
    const key     = forn?.id ?? "__sem_fornecedor__";
    const nome    = forn?.nome ?? "Sem fornecedor";
    const custo   = e.quantidade * (e.precoUnitario || e.produto.precoUnitario);

    if (!fornMap.has(key)) fornMap.set(key, { nome, totalGasto: 0, totalItens: 0, entradas: [] });
    const entry = fornMap.get(key)!;
    entry.totalGasto += custo;
    entry.totalItens += e.quantidade;
    entry.entradas.push({ data: e.criadoEm, produto: e.produto.nome, unidade: e.produto.unidade, quantidade: e.quantidade, custo });
  }

  const fornecedores = Array.from(fornMap.values())
    .sort((a, b) => b.totalGasto - a.totalGasto);

  const totalGeral = fornecedores.reduce((acc, f) => acc + f.totalGasto, 0);

  return NextResponse.json({
    de:          inicio.toISOString().slice(0, 10),
    ate:         fim.toISOString().slice(0, 10),
    totalGeral,
    fornecedores,
  });
}
