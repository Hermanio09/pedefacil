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

  const movs = await db.movimentacao.findMany({
    where: {
      empresaId: session.empresaId,
      criadoEm:  { gte: inicio, lte: fim },
      revertida: false,
    },
    include: {
      produto: { select: { nome: true, unidade: true, precoUnitario: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  const entradas = movs.filter((m) => m.tipo === "entrada");
  const saidas   = movs.filter((m) => m.tipo === "saida");
  const ajustes  = movs.filter((m) => m.tipo === "ajuste");

  const custoEntradas  = entradas.reduce((acc, m) => acc + m.quantidade * (m.precoUnitario || m.produto.precoUnitario), 0);
  const totalEntradasQtd = entradas.reduce((acc, m) => acc + m.quantidade, 0);
  const totalSaidasQtd   = saidas.reduce((acc, m) => acc + m.quantidade, 0);

  return NextResponse.json({
    de:              inicio.toISOString().slice(0, 10),
    ate:             fim.toISOString().slice(0, 10),
    totalEntradas:   entradas.length,
    totalSaidas:     saidas.length,
    totalAjustes:    ajustes.length,
    qtdEntradas:     totalEntradasQtd,
    qtdSaidas:       totalSaidasQtd,
    custoEntradas,
    movimentacoes:   movs.map((m) => ({
      id:         m.id,
      data:       m.criadoEm,
      tipo:       m.tipo,
      produto:    m.produto.nome,
      unidade:    m.produto.unidade,
      quantidade: m.quantidade,
      preco:      m.precoUnitario || m.produto.precoUnitario,
      total:      m.quantidade * (m.precoUnitario || m.produto.precoUnitario),
      observacao: m.observacao,
    })),
  });
}
