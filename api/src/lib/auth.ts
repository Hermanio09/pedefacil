import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não definido no .env.local — não inicie o servidor sem ele.");
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
export const COOKIE = "pf_token";

export type UserPayload = {
  userId:    string;
  empresaId: string;
  email:     string;
  nome:      string;
  role:      "admin" | "gerente" | "operador";
};

export async function signToken(payload: UserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as UserPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Revalida contra o banco a cada requisição — sem isso, desativar um usuário ou mudar seu
  // papel não teria efeito até o token expirar (até 8h depois), já que o JWT por si só só
  // prova que foi assinado por nós, não que os dados dentro dele ainda são atuais.
  const usuario = await db.usuario.findUnique({
    where:   { id: payload.userId },
    include: { empresa: { select: { ativo: true } } },
  });
  if (!usuario || !usuario.ativo || !usuario.empresa?.ativo) return null;

  return {
    userId:    usuario.id,
    empresaId: usuario.empresaId,
    email:     usuario.email,
    nome:      usuario.nome,
    role:      usuario.role as UserPayload["role"],
  };
}
