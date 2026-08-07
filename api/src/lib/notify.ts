import { db } from "@/lib/db";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:suporte@stockfacil.com.br",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY            ?? ""
);

type NotificarOpts = {
  empresaId: string;
  title:     string;
  body:      string;
  url?:      string;
  tag?:      string;
  /** Se informado, só envia para usuários com esses roles. Sem isso, envia para todos da empresa. */
  roles?:    ("admin" | "gerente" | "operador")[];
};

/** Dispara push notification para uma empresa, opcionalmente restrito por role. Nunca lança erro — falha silenciosa. */
export async function notificar(opts: NotificarOpts): Promise<void> {
  try {
    const subs = await db.pushSubscription.findMany({ where: { empresaId: opts.empresaId } });
    if (subs.length === 0) return;

    let usuarioIdsPermitidos: Set<string> | null = null;
    if (opts.roles?.length) {
      const usuarios = await db.usuario.findMany({
        where:  { empresaId: opts.empresaId, role: { in: opts.roles } },
        select: { id: true },
      });
      usuarioIdsPermitidos = new Set(usuarios.map((u) => u.id));
    }

    const destinatarios = usuarioIdsPermitidos
      ? subs.filter((s) => usuarioIdsPermitidos!.has(s.usuarioId))
      : subs;

    if (destinatarios.length === 0) return;

    const payload = JSON.stringify({
      title: opts.title,
      body:  opts.body,
      url:   opts.url ?? "/",
      tag:   opts.tag ?? "pedefacil",
    });

    await Promise.allSettled(
      destinatarios.map((s) =>
        webpush.sendNotification(JSON.parse(s.subscription), payload).catch(async (err) => {
          if (err.statusCode === 410) await db.pushSubscription.deleteMany({ where: { endpoint: s.endpoint, empresaId: opts.empresaId } }).catch(() => {});
        })
      )
    );
  } catch (err) {
    console.error("Erro ao enviar notificação push:", err);
  }
}
