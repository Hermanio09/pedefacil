/** Faz parse de uma data "YYYY-MM-DD" vinda de query string, com hora fixa.
 * Retorna undefined se o parâmetro não veio ou não é uma data válida (em vez de deixar
 * um `new Date("abc")` (Invalid Date) vazar pra uma query do Prisma e derrubar a rota
 * com erro 500). */
export function parseDataParam(valor: string | null, hora: "inicio" | "fim"): Date | undefined {
  if (!valor) return undefined;
  const data = new Date(`${valor}T${hora === "inicio" ? "00:00:00" : "23:59:59"}`);
  return Number.isNaN(data.getTime()) ? undefined : data;
}

/** Faz parse de um número de página (1-based) vindo de query string, sempre retornando um
 * inteiro válido >= 1 — protege contra ?page=abc, ?page=0, ?page=-5, etc. */
export function parsePageParam(valor: string | null): number {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
