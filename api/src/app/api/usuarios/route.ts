import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ROLES_VALIDOS } from "@/lib/permissoes";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const usuarios = await db.usuario.findMany({
    where:   { empresaId: session.empresaId },
    orderBy: { nome: "asc" },
    select:  { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
  });
  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  // O 409 de "e-mail já cadastrado" (checagem global, não só desta empresa — necessário pois
  // login é só por e-mail) deixa um admin descobrir se um e-mail existe em qualquer empresa do
  // sistema. Não dá pra tirar esse retorno sem prejudicar a experiência normal de cadastro, mas
  // limitar a taxa de tentativas dificulta usar isso pra varrer uma lista de e-mails.
  const rl = rateLimit(`criar-usuario:${session.userId}`, 20, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${Math.ceil(rl.resetIn / 60000)} minuto(s) e tente novamente.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  const { nome, email, senha, role } = await req.json();
  if (!nome || !email || !senha) return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
  if (senha.length < 6) return NextResponse.json({ error: "Senha deve ter mínimo 6 caracteres." }, { status: 400 });
  if (role !== undefined && !ROLES_VALIDOS.includes(role))
    return NextResponse.json({ error: "Role inválido." }, { status: 400 });

  const existente = await db.usuario.findUnique({ where: { email: email.toLowerCase() } });
  if (existente) return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });

  const hash    = await bcrypt.hash(senha, 10);
  const usuario = await db.usuario.create({
    data: { empresaId: session.empresaId, nome, email: email.toLowerCase(), senha: hash, role: role ?? "operador" },
  });
  return NextResponse.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role }, { status: 201 });
}
