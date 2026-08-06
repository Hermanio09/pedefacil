import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const { id } = await params;

  const fornecedor = await db.fornecedor.findFirst({ where: { id, empresaId: session.empresaId } });
  if (!fornecedor) return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
  return NextResponse.json(fornecedor);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const { id }  = await params;
  const { nome, telefone, email } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });

  const count = await db.fornecedor.updateMany({
    where: { id, empresaId: session.empresaId },
    data:  { nome: nome.trim(), telefone: telefone?.trim() || null, email: email?.trim() || null },
  });
  if (count.count === 0) return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const { id }  = await params;

  await db.fornecedor.deleteMany({ where: { id, empresaId: session.empresaId } });
  return NextResponse.json({ ok: true });
}
