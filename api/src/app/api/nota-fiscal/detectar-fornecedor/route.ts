import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "operador") return NextResponse.json({ fornecedor: null, reconhecidos: 0 });

  const { nomes }: { nomes: string[] } = await req.json();
  if (!nomes?.length) return NextResponse.json({ fornecedor: null, reconhecidos: 0 });

  const produtos = await db.produto.findMany({
    where:   { empresaId: session.empresaId, fornecedorId: { not: null } },
    include: { fornecedor: true },
  });

  const contagem = new Map<string, { fornecedor: NonNullable<typeof produtos[0]["fornecedor"]>; total: number }>();

  for (const nome of nomes) {
    const normalizado = nome.toLowerCase().trim();
    const match = produtos.find((p) => p.nome.toLowerCase().trim() === normalizado);
    if (match?.fornecedor) {
      const entry = contagem.get(match.fornecedor.id);
      if (entry) entry.total++;
      else contagem.set(match.fornecedor.id, { fornecedor: match.fornecedor, total: 1 });
    }
  }

  if (contagem.size === 0) return NextResponse.json({ fornecedor: null, reconhecidos: 0 });

  const melhor = Array.from(contagem.values()).sort((a, b) => b.total - a.total)[0];
  return NextResponse.json({ fornecedor: melhor.fornecedor, reconhecidos: melhor.total });
}
