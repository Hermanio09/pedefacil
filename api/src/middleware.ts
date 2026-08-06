import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Sem fallback: um segredo padrão conhecido publicamente permitiria forjar tokens e passar
// direto pelo gate de rotas protegidas. Se a variável não estiver definida, falha fechado
// (trata como não-autenticado) em vez de aceitar um segredo previsível.
const SECRET = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null;

const PUBLIC = [
  "/login", "/setup", "/offline",
  "/api/auth", "/api/setup",
  "/_next", "/favicon",
  "/manifest", "/sw.js", "/icons", "/apple-icon", "/icon",
];

// Mesma origem usada pelo CORS em next.config.js — reaproveitada aqui pra checagem de CSRF.
const ORIGEM_ESPERADA = process.env.NODE_ENV === "production"
  ? process.env.NEXT_PUBLIC_APP_URL ?? "https://seudominio.com.br"
  : "http://localhost:3001";

const METODOS_MUTAVEIS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSRF: numa requisição que muda estado, o navegador só omite/mente o header Origin em
  // cenários que não nos interessam aqui — num ataque de CSRF de verdade (um site malicioso
  // fazendo o navegador da vítima disparar a requisição, usando o cookie de sessão dela
  // automaticamente), o Origin vem do site atacante, não do nosso. Barra isso sem precisar de
  // token CSRF nem mudar nada nas telas do app.
  if (pathname.startsWith("/api/") && METODOS_MUTAVEIS.has(req.method)) {
    const origin = req.headers.get("origin");
    if (origin && origin !== ORIGEM_ESPERADA) {
      return NextResponse.json({ error: "Origem da requisição não permitida." }, { status: 403 });
    }
  }

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("pf_token")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  if (!SECRET) {
    console.error("JWT_SECRET não definido — negando acesso por padrão.");
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("pf_token");
    return res;
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("pf_token");
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|icons|manifest|apple-icon|offline).*)"],
};
