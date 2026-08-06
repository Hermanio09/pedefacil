import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const total = await db.empresa.count();
  return NextResponse.json({ precisaSetup: total === 0 });
}

export async function POST(req: NextRequest) {
  const { nomeEmpresa, ramo, nome, email, senha } = await req.json();
  if (!nomeEmpresa || !nome || !email || !senha)
    return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
  if (senha.length < 6)
    return NextResponse.json({ error: "Senha deve ter no mínimo 6 caracteres." }, { status: 400 });

  const hash = await bcrypt.hash(senha, 10);

  try {
    // Checagem + criação na mesma transação: o SQLite serializa transações de escrita
    // concorrentes (só um "writer" por vez), então duas requisições simultâneas não
    // conseguem mais passar juntas pela checagem de "ainda não existe empresa".
    const empresa = await db.$transaction(async (tx) => {
      const total = await tx.empresa.count();
      if (total > 0) throw new Error("SETUP_JA_REALIZADO");

      return tx.empresa.create({
        data: {
          nome: nomeEmpresa.trim(),
          ramo: ramo?.trim() || "geral",
          usuarios: {
            create: { nome, email: email.toLowerCase(), senha: hash, role: "admin" },
          },
        },
        include: { usuarios: true },
      });
    });

    return NextResponse.json({ ok: true, empresaId: empresa.id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "SETUP_JA_REALIZADO")
      return NextResponse.json({ error: "Setup já foi realizado." }, { status: 400 });
    throw err;
  }
}
