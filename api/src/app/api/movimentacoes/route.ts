import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notificar } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { produtoId, tipo, quantidade, observacao, precoUnitario, direcao } = await req.json();

  if (!produtoId || !tipo || !quantidade)
    return NextResponse.json({ error: "produtoId, tipo e quantidade são obrigatórios." }, { status: 400 });
  if (!["entrada", "saida", "ajuste"].includes(tipo))
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  if (quantidade <= 0)
    return NextResponse.json({ error: "Quantidade deve ser positiva." }, { status: 400 });

  // Garante que o produto pertence à empresa
  const produto = await db.produto.findFirst({
    where: { id: produtoId, empresaId: session.empresaId },
  });
  if (!produto) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  // "ajuste" pode ir em qualquer direção — quem chama informa via `direcao`. Sem isso
  // especificado, mantém o comportamento anterior (decremento) para não quebrar chamadas
  // já existentes que não enviam esse campo.
  const delta =
    tipo === "entrada" ? quantidade :
    tipo === "ajuste"  ? (direcao === "entrada" ? quantidade : -quantidade) :
    -quantidade;

  let movimentacao;
  try {
    movimentacao = await db.$transaction(async (tx) => {
      if (delta < 0) {
        // Update condicional e atômico: só decrementa se o estoque no banco (não a foto
        // desatualizada que o cliente tinha) ainda comportar a saída — evita ir a negativo
        // sob requisições concorrentes.
        const atualizado = await tx.produto.updateMany({
          where: { id: produtoId, empresaId: session.empresaId, estoqueAtual: { gte: quantidade } },
          data:  { estoqueAtual: { decrement: quantidade } },
        });
        if (atualizado.count === 0) throw new Error("ESTOQUE_INSUFICIENTE");
      } else {
        await tx.produto.updateMany({
          where: { id: produtoId, empresaId: session.empresaId },
          data:  { estoqueAtual: { increment: delta } },
        });
      }

      return tx.movimentacao.create({
        data: {
          empresaId:       session.empresaId,
          produtoId,
          tipo,
          quantidade,
          precoUnitario:   precoUnitario ?? 0,
          estoquePositivo: delta > 0,
          observacao:      observacao || null,
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ESTOQUE_INSUFICIENTE") {
      return NextResponse.json({ error: "Estoque insuficiente para esta saída." }, { status: 409 });
    }
    throw err;
  }

  const atualizado = await db.produto.findUnique({ where: { id: produtoId } });
  const cruzouLimite = !!atualizado && atualizado.estoqueAtual <= atualizado.estoqueMinimo;

  // Notifica admin/gerente só quando a movimentação reduz estoque e cruza o limite
  if (delta < 0 && cruzouLimite && atualizado) {
    const zerado = atualizado.estoqueAtual <= 0;
    notificar({
      empresaId: session.empresaId,
      roles:     ["admin", "gerente"],
      title:     zerado ? "🚨 Estoque zerado" : "⚠️ Estoque baixo",
      body:      `${atualizado.nome} — ${atualizado.estoqueAtual} ${atualizado.unidade} restante(s)`,
      url:       "/produtos",
      tag:       `estoque-${atualizado.id}`,
    });
  }

  return NextResponse.json({
    movimentacao,
    estoqueAtual: atualizado?.estoqueAtual,
    alerta: cruzouLimite,
  }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const produtoId = searchParams.get("produtoId");

  const movimentacoes = await db.movimentacao.findMany({
    where:   { empresaId: session.empresaId, ...(produtoId ? { produtoId } : {}) },
    orderBy: { criadoEm: "desc" },
    take:    50,
    include: { produto: { select: { nome: true } } },
  });
  return NextResponse.json(movimentacoes);
}
