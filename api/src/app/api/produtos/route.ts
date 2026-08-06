import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ocultarPrecoLista, podeVerFinanceiro } from "@/lib/permissoes";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const produtos = await db.produto.findMany({
    where:   { empresaId: session.empresaId },
    orderBy: { nome: "asc" },
    include: { fornecedor: { select: { id: true, nome: true, telefone: true, email: true } } },
  });

  const resultado = produtos.map((p) => ({ ...p, estoqueAbaixoMinimo: p.estoqueAtual <= p.estoqueMinimo }));
  return NextResponse.json(ocultarPrecoLista(resultado, session.role));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { nome, unidade, estoqueAtual, estoqueMinimo, precoUnitario, precoVenda, fornecedorId } = await req.json();
  if (!nome) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });

  // Operador não pode definir preço — qualquer valor enviado é ignorado
  const podeVer         = podeVerFinanceiro(session.role);
  const precoFinal      = podeVer ? (precoUnitario ?? 0) : 0;
  const precoVendaFinal = podeVer ? (precoVenda ?? 0) : 0;

  // Confirma que o fornecedor informado pertence à mesma empresa antes de vincular — evita
  // linkar (e vazar nome/telefone/e-mail de) um fornecedor de outro tenant.
  let fornecedorIdFinal: string | null = null;
  if (fornecedorId) {
    const fornecedor = await db.fornecedor.findFirst({ where: { id: fornecedorId, empresaId: session.empresaId }, select: { id: true } });
    if (!fornecedor) return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
    fornecedorIdFinal = fornecedor.id;
  }

  const produto = await db.produto.create({
    data: {
      empresaId:     session.empresaId,
      nome,
      unidade:       (unidade ?? "UN").toUpperCase(),
      estoqueAtual:  estoqueAtual  ?? 0,
      estoqueMinimo: estoqueMinimo ?? 5,
      precoUnitario: precoFinal,
      precoVenda:    precoVendaFinal,
      fornecedorId:  fornecedorIdFinal,
    },
    include: { fornecedor: { select: { id: true, nome: true } } },
  });

  return NextResponse.json(podeVer ? produto : { ...produto, precoUnitario: undefined, precoVenda: undefined }, { status: 201 });
}
