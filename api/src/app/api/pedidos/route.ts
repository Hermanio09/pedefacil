import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const pedidos = await db.pedido.findMany({
    where:   { empresaId: session.empresaId },
    orderBy: { criadoEm: "desc" },
    take:    100,
  });

  const resultado = pedidos.map((p) => ({
    id:             p.id,
    fornecedorNome: p.fornecedorNome,
    itens:          JSON.parse(p.itens) as { produtoId: string; nome: string; quantidade: number; unidade: string }[],
    whatsapp:       p.whatsapp,
    email:          p.email,
    enviadoPorNome: p.enviadoPorNome,
    criadoEm:       p.criadoEm,
  }));

  return NextResponse.json(resultado);
}
