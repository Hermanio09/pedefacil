import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const hoje    = new Date();
  const ha14    = new Date(hoje);
  ha14.setDate(hoje.getDate() - 13);
  ha14.setHours(0, 0, 0, 0);

  const movs = await db.movimentacao.findMany({
    where:   { empresaId: session.empresaId, criadoEm: { gte: ha14 } },
    include: { produto: { select: { nome: true } } },
    orderBy: { criadoEm: "asc" },
  });

  const diasMap = new Map<string, { dia: string; entradas: number; saidas: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    const chave = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    diasMap.set(chave, { dia: chave, entradas: 0, saidas: 0 });
  }

  for (const m of movs) {
    const chave = m.criadoEm.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const entry = diasMap.get(chave);
    if (!entry) continue;
    if (m.tipo === "entrada") entry.entradas += m.quantidade;
    else if (m.tipo === "saida") entry.saidas += m.quantidade;
  }

  const consumoMap = new Map<string, number>();
  for (const m of movs.filter((x) => x.tipo === "saida")) {
    consumoMap.set(m.produto.nome, (consumoMap.get(m.produto.nome) ?? 0) + m.quantidade);
  }
  const topConsumo = Array.from(consumoMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([nome, quantidade]) => ({ nome: nome.length > 20 ? nome.slice(0, 18) + "…" : nome, quantidade }));

  return NextResponse.json({ consumoDiario: Array.from(diasMap.values()), topConsumo });
}
