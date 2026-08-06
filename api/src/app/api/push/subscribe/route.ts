import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const subscription = await req.json();
  const endpoint     = subscription?.endpoint;
  if (!endpoint) return NextResponse.json({ error: "Subscription inválida." }, { status: 400 });

  await db.pushSubscription.upsert({
    where:  { endpoint },
    update: { subscription: JSON.stringify(subscription), usuarioId: session.userId, empresaId: session.empresaId },
    create: { endpoint, subscription: JSON.stringify(subscription), usuarioId: session.userId, empresaId: session.empresaId },
  });

  return NextResponse.json({ ok: true });
}
