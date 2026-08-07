import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { podeVerFinanceiro } from "@/lib/permissoes";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;

  const produto = await db.produto.findFirst({
    where:   { id, empresaId: session.empresaId },
    include: { movimentacoes: { orderBy: { criadoEm: "desc" }, take: 30 } },
  });

  if (!produto) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  if (!podeVerFinanceiro(session.role)) {
    const { precoUnitario, precoVenda, ...resto } = produto;
    const movimentacoes = produto.movimentacoes.map(({ precoUnitario: _p, ...m }) => m);
    return NextResponse.json({ ...resto, movimentacoes });
  }

  return NextResponse.json(produto);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { nome, unidade, estoqueMinimo, precoUnitario, precoVenda, fornecedorId } = body;

  const updateData: Record<string, unknown> = { nome, unidade, estoqueMinimo };
  // Operador não pode alterar preço — campo ignorado mesmo que enviado
  if (precoUnitario !== undefined && podeVerFinanceiro(session.role)) updateData.precoUnitario = Number(precoUnitario) || 0;
  if (precoVenda    !== undefined && podeVerFinanceiro(session.role)) updateData.precoVenda    = Number(precoVenda)    || 0;

  if (fornecedorId !== undefined) {
    if (fornecedorId) {
      // Confirma que o fornecedor pertence à mesma empresa antes de vincular — evita linkar
      // (e vazar dado de) um fornecedor de outro tenant.
      const fornecedor = await db.fornecedor.findFirst({ where: { id: fornecedorId, empresaId: session.empresaId }, select: { id: true } });
      if (!fornecedor) return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
      updateData.fornecedorId = fornecedor.id;
    } else {
      updateData.fornecedorId = null;
    }
  }

  const produto = await db.produto.updateMany({
    where: { id, empresaId: session.empresaId },
    data:  updateData,
  });

  if (produto.count === 0) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const { id } = await params;

  await db.produto.deleteMany({ where: { id, empresaId: session.empresaId } });
  return NextResponse.json({ ok: true });
}
