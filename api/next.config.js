/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

// Em produção, só permite a origem do próprio domínio
const allowedOrigin = isProd
  ? process.env.NEXT_PUBLIC_APP_URL ?? "https://seudominio.com.br"
  : "http://localhost:3001";

const nextConfig = {
  // O middleware roda em praticamente todas as rotas (inclusive uploads de nota fiscal) e
  // por padrão só lê os primeiros 10MB do corpo da requisição, truncando uploads maiores em
  // vez de rejeitar com um erro claro. Aumenta o teto pra cobrir um lote de até 10 arquivos
  // (o limite "de verdade", por arquivo, é validado depois em src/lib/uploads.ts).
  experimental: {
    middlewareClientMaxBodySize: "90mb",
  },
  async headers() {
    return [
      // Headers de segurança em todas as rotas
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",            value: "DENY" },
          { key: "X-XSS-Protection",           value: "1; mode=block" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // CORS restrito nas rotas de API
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: allowedOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
