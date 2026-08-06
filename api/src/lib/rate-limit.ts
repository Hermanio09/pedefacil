type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Limpa entradas expiradas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; remaining: number; resetIn: number } {
  const now  = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, resetIn: windowMs };
  }

  if (entry.count >= max) {
    return { ok: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { ok: true, remaining: max - entry.count, resetIn: entry.resetAt - now };
}
