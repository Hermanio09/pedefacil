import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ROLES_VALIDOS } from "@/lib/permissoes";
import bcrypt from "bcryptjs";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  const u = await db.usuario.findFirst({
    where:  { id, empresaId: session.empresaId },
    select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
  });
  if (!u) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  return NextResponse.json(u);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  const { nome, email, senha, role, ativo } = await req.json();

  if (role !== undefined && !ROLES_VALIDOS.includes(role))
    return NextResponse.json({ error: "Role inválido." }, { status: 400 });

  const data: Record<string, unknown> = { nome, email: email?.toLowerCase(), role, ativo };
  if (senha && senha.length >= 6) data.senha = await bcrypt.hash(senha, 10);

  const resultado = await db.usuario.updateMany({
    where: { id, empresaId: session.empresaId },
    data,
  });
  if (resultado.count === 0) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const usuario = await db.usuario.findUnique({ where: { id } });
  return NextResponse.json({ id: usuario!.id, nome: usuario!.nome, role: usuario!.role });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  if (session.userId === id) return NextResponse.json({ error: "Não é possível excluir o próprio usuário." }, { status: 400 });

  const resultado = await db.usuario.deleteMany({ where: { id, empresaId: session.empresaId } });
  if (resultado.count === 0) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
