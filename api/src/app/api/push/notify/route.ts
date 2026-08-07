import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:suporte@stockfacil.com.br",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  ?? "",
  process.env.VAPID_PRIVATE_KEY             ?? ""
);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { title, body, url, tag } = await req.json();
  if (!title || !body) return NextResponse.json({ error: "title e body são obrigatórios." }, { status: 400 });

  // Só aceita caminho relativo (mesma origem) — evita que a notificação seja usada como
  // vetor de phishing abrindo um link externo arbitrário ao ser clicada.
  const urlSegura = typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : "/";

  // Busca todas as assinaturas da empresa
  const subs = await db.pushSubscription.findMany({
    where: { empresaId: session.empresaId },
  });

  if (subs.length === 0) return NextResponse.json({ enviados: 0 });

  const payload = JSON.stringify({ title, body, url: urlSegura, tag: tag ?? "pedefacil" });

  const resultados = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(JSON.parse(s.subscription), payload).catch(async (err) => {
        // Remove assinatura expirada
        if (err.statusCode === 410) await db.pushSubscription.deleteMany({ where: { endpoint: s.endpoint, empresaId: session.empresaId } });
        throw err;
      })
    )
  );

  const enviados = resultados.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ enviados, total: subs.length });
}
