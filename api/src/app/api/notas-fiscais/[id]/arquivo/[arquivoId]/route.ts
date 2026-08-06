import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; arquivoId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id, arquivoId } = await params;

  const arquivo = await db.notaFiscalArquivo.findFirst({
    where: { id: arquivoId, notaFiscalId: id, notaFiscal: { empresaId: session.empresaId } },
  });

  if (!arquivo) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });

  return new NextResponse(new Uint8Array(arquivo.dados), {
    status: 200,
    headers: {
      "Content-Type":        arquivo.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(arquivo.nome)}"`,
      "Cache-Control":       "private, max-age=0, no-cache",
    },
  });
}
