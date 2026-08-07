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

  const ajustes = await db.movimentacao.findMany({
    where: {
      empresaId:  session.empresaId,
      tipo:       "ajuste",
      observacao: { contains: "Fechamento" },
      criadoEm:   { gte: inicio, lte: fim },
      revertida:  false,
    },
    include: { produto: { select: { nome: true, unidade: true } } },
    orderBy: { criadoEm: "desc" },
  });

  // Agrupar por data (dia)
  const diasMap = new Map<string, {
    data:    string;
    itens:   { produto: string; unidade: string; quantidade: number; observacao: string | null }[];
    total:   number;
  }>();

  for (const a of ajustes) {
    const dia = a.criadoEm.toISOString().slice(0, 10);
    if (!diasMap.has(dia)) diasMap.set(dia, { data: dia, itens: [], total: 0 });
    const entry = diasMap.get(dia)!;
    entry.itens.push({ produto: a.produto.nome, unidade: a.produto.unidade, quantidade: a.quantidade, observacao: a.observacao });
    // Direção importa: um ajuste pode somar (contagem achou mais) ou subtrair (achou menos)
    // estoque — sem isso, um +10 e um -10 no mesmo dia viravam "total: 20" em vez de 0.
    entry.total += a.estoquePositivo ? a.quantidade : -a.quantidade;
  }

  const dias = Array.from(diasMap.values()).sort((a, b) => b.data.localeCompare(a.data));

  return NextResponse.json({
    de:             inicio.toISOString().slice(0, 10),
    ate:            fim.toISOString().slice(0, 10),
    totalFechamentos: dias.length,
    dias,
  });
}
