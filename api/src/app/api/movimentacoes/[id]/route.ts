import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Desfaz o efeito de uma movimentação no estoque, mas mantém o registro no histórico
// (marcado como revertida) em vez de apagar — preserva o rastro de auditoria de que houve
// um erro seguido de uma correção.
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;

  const mov = await db.movimentacao.findFirst({ where: { id, empresaId: session.empresaId } });
  if (!mov) return NextResponse.json({ error: "Movimentação não encontrada." }, { status: 404 });
  if (mov.revertida) return NextResponse.json({ error: "Esta movimentação já foi revertida." }, { status: 400 });

  try {
    const atualizado = await db.$transaction(async (tx) => {
      if (mov.estoquePositivo) {
        // Estava somando estoque — reverter significa tirar de volta. Update condicional e
        // atômico: só permite se ainda houver estoque suficiente (parte pode já ter sido
        // consumida por movimentações posteriores).
        const resultado = await tx.produto.updateMany({
          where: { id: mov.produtoId, empresaId: session.empresaId, estoqueAtual: { gte: mov.quantidade } },
          data:  { estoqueAtual: { decrement: mov.quantidade } },
        });
        if (resultado.count === 0) throw new Error("ESTOQUE_INSUFICIENTE");
      } else {
        // Estava tirando estoque — reverter significa devolver.
        await tx.produto.updateMany({
          where: { id: mov.produtoId, empresaId: session.empresaId },
          data:  { estoqueAtual: { increment: mov.quantidade } },
        });
      }

      return tx.movimentacao.update({
        where: { id: mov.id },
        data:  { revertida: true, revertidaEm: new Date(), revertidaPorNome: session.nome },
      });
    });

    const produto = await db.produto.findUnique({ where: { id: mov.produtoId }, select: { estoqueAtual: true } });
    return NextResponse.json({ movimentacao: atualizado, estoqueAtual: produto?.estoqueAtual });
  } catch (err) {
    if (err instanceof Error && err.message === "ESTOQUE_INSUFICIENTE") {
      return NextResponse.json(
        { error: "Não é possível reverter: o estoque atual é menor que a quantidade desta entrada (parte já foi consumida)." },
        { status: 409 }
      );
    }
    throw err;
  }
}
