import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, COOKIE } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

// O primeiro valor de X-Forwarded-For é preenchido pelo próprio cliente e pode ser forjado
// livremente; o valor confiável é o que o proxy mais próximo do servidor adicionou por último.
// X-Real-IP normalmente é setado direto pelo proxy a partir do socket, então tem prioridade.
function obterIp(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const partes = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (partes.length) return partes[partes.length - 1];
  }

  return "unknown";
}

export async function POST(req: NextRequest) {
  // Rate limiting: 5 tentativas por IP a cada 15 minutos
  const ip = obterIp(req);
  const rl = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);

  if (!rl.ok) {
    const minutos = Math.ceil(rl.resetIn / 60000);
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${minutos} minuto(s) e tente novamente.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  const body = await req.json().catch(() => null);
  const { email, senha } = body ?? {};

  if (!email || !senha)
    return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });

  // Segunda camada, independente do IP: limita tentativas por conta-alvo, já que o
  // cabeçalho de IP pode não ser confiável dependendo de como a aplicação está hospedada.
  const rlEmail = rateLimit(`login-email:${String(email).toLowerCase().trim()}`, 5, 15 * 60 * 1000);
  if (!rlEmail.ok) {
    const minutos = Math.ceil(rlEmail.resetIn / 60000);
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${minutos} minuto(s) e tente novamente.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rlEmail.resetIn / 1000)) } }
    );
  }

  const usuario = await db.usuario.findUnique({
    where:   { email: String(email).toLowerCase().trim() },
    include: { empresa: { select: { id: true, ativo: true } } },
  });

  if (!usuario || !usuario.ativo)
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });

  if (!usuario.empresa?.ativo)
    return NextResponse.json({ error: "Conta desativada. Contate o suporte." }, { status: 403 });

  const ok = await bcrypt.compare(String(senha), usuario.senha);
  if (!ok)
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });

  const token = await signToken({
    userId:    usuario.id,
    empresaId: usuario.empresaId,
    email:     usuario.email,
    nome:      usuario.nome,
    role:      usuario.role as "admin" | "gerente" | "operador",
  });

  const res = NextResponse.json({ ok: true, nome: usuario.nome, role: usuario.role });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    path:     "/",
    maxAge:   60 * 60 * 8,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
  });
  return res;
}
