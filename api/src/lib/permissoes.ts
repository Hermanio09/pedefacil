export type Role = "admin" | "gerente" | "operador";

export const ROLES_VALIDOS: Role[] = ["admin", "gerente", "operador"];

export const podeVerFinanceiro = (role: Role) => role !== "operador";

/** Remove campos de preço/valor de um objeto produto quando o role não pode ver financeiro. */
export function ocultarPrecoProduto<T extends { precoUnitario?: number; precoVenda?: number; valorTotal?: number }>(
  produto: T,
  role: Role
): T {
  if (podeVerFinanceiro(role)) return produto;
  const { precoUnitario, precoVenda, valorTotal, ...resto } = produto;
  return resto as T;
}

export function ocultarPrecoLista<T extends { precoUnitario?: number; precoVenda?: number; valorTotal?: number }>(
  lista: T[],
  role: Role
): T[] {
  if (podeVerFinanceiro(role)) return lista;
  return lista.map((item) => ocultarPrecoProduto(item, role));
}
