import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notificar } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { itens } = await req.json() as { itens: { produtoId: string; estoqueContado: number }[] };
  if (!itens || itens.length === 0)
    return NextResponse.json({ error: "Nenhum item informado." }, { status: 400 });

  const resultados = [];

  for (const item of itens) {
    const produto = await db.produto.findFirst({
      where: { id: item.produtoId, empresaId: session.empresaId },
    });
    if (!produto) continue;

    const diferenca = item.estoqueContado - produto.estoqueAtual;
    if (diferenca === 0) {
      resultados.push({ produto: produto.nome, saida: 0, entradaNaoRegistrada: 0, estoqueAnterior: produto.estoqueAtual, estoqueContado: item.estoqueContado });
      continue;
    }

    const quantidade = Math.abs(diferenca);
    await db.$transaction([
      db.movimentacao.create({
        data: {
          empresaId:       session.empresaId,
          produtoId:       produto.id,
          tipo:            "ajuste",
          quantidade,
          estoquePositivo: diferenca > 0,
          observacao:      `Fechamento do dia — ${diferenca < 0 ? "saída" : "entrada"} não registrada`,
        },
      }),
      // increment relativo (não absoluto) — preserva movimentações concorrentes registradas
      // entre a leitura do estoque acima e esta escrita, em vez de sobrescrevê-las.
      db.produto.updateMany({ where: { id: produto.id, empresaId: session.empresaId }, data: { estoqueAtual: { increment: diferenca } } }),
    ]);

    resultados.push({
      produto:              produto.nome,
      estoqueAnterior:      produto.estoqueAtual,
      estoqueContado:       item.estoqueContado,
      saida:                diferenca < 0 ? quantidade : 0,
      entradaNaoRegistrada: diferenca > 0 ? quantidade : 0,
      possivelPerda:        diferenca < 0,
    });
  }

  const todos   = await db.produto.findMany({ where: { empresaId: session.empresaId }, orderBy: { nome: "asc" } });
  const alertas = todos.filter((p) => p.estoqueAtual <= p.estoqueMinimo).map((p) => p.nome);

  if (alertas.length > 0) {
    notificar({
      empresaId: session.empresaId,
      roles:     ["admin", "gerente"],
      title:     "⚠️ Alertas após fechamento",
      body:      alertas.length === 1
        ? `${alertas[0]} está com estoque baixo ou zerado`
        : `${alertas.length} produtos com estoque baixo ou zerado`,
      url:       "/produtos",
      tag:       "fechamento-alertas",
    });
  }

  return NextResponse.json({ resultados, alertas });
}
