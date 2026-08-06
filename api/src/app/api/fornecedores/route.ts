import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const fornecedores = await db.fornecedor.findMany({
    where:   { empresaId: session.empresaId },
    orderBy: { nome: "asc" },
    include: { _count: { select: { produtos: true } } },
  });
  return NextResponse.json(fornecedores);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { nome, telefone, email } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });

  const fornecedor = await db.fornecedor.create({
    data: {
      empresaId: session.empresaId,
      nome:      nome.trim(),
      telefone:  telefone?.trim() || null,
      email:     email?.trim()    || null,
    },
  });
  return NextResponse.json(fornecedor, { status: 201 });
}
