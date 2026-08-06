import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { notificar } from "@/lib/notify";
import { validarArquivos } from "@/lib/uploads";
import { rateLimit } from "@/lib/rate-limit";

type ItemNota = { nome: string; quantidade: number; unidade: string; precoUnitario: number };
type DadosNota = { itens: ItemNota[]; fornecedor: string | null; dataEmissao: string | null; valorTotal: number };

function parseNFeXML(xml: string): DadosNota {
  const itens: ItemNota[] = [];
  const detRegex = /<det[^>]*>([\s\S]*?)<\/det>/g;
  let match;

  while ((match = detRegex.exec(xml)) !== null) {
    const det = match[1];
    const xProd  = det.match(/<xProd>(.*?)<\/xProd>/)?.[1]?.trim()   ?? "";
    const qCom   = det.match(/<qCom>(.*?)<\/qCom>/)?.[1]?.trim()     ?? "0";
    const uCom   = det.match(/<uCom>(.*?)<\/uCom>/)?.[1]?.trim()     ?? "UN";
    const vUnCom = det.match(/<vUnCom>(.*?)<\/vUnCom>/)?.[1]?.trim() ?? "0";

    if (xProd) {
      itens.push({
        nome:          xProd,
        quantidade:    parseFloat(qCom) || 1,
        unidade:       uCom.toUpperCase(),
        precoUnitario: parseFloat(vUnCom) || 0,
      });
    }
  }

  const emitBloco  = xml.match(/<emit>([\s\S]*?)<\/emit>/)?.[1] ?? "";
  const fornecedor = emitBloco.match(/<xNome>(.*?)<\/xNome>/)?.[1]?.trim() ?? null;

  const ideBloco = xml.match(/<ide>([\s\S]*?)<\/ide>/)?.[1] ?? "";
  const dataBruta = ideBloco.match(/<dhEmi>(.*?)<\/dhEmi>/)?.[1] ?? ideBloco.match(/<dEmi>(.*?)<\/dEmi>/)?.[1] ?? "";
  const dataEmissao = dataBruta ? dataBruta.slice(0, 10) : null;

  const totalBloco = xml.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/)?.[1] ?? "";
  const valorTotal = parseFloat(totalBloco.match(/<vNF>(.*?)<\/vNF>/)?.[1] ?? "0") || 0;

  return { itens, fornecedor, dataEmissao, valorTotal };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const rl = rateLimit(`nota-fiscal-xml:${session.userId}`, 50, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas análises em pouco tempo. Aguarde ${Math.ceil(rl.resetIn / 60000)} minuto(s) e tente novamente.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  try {
    const form = await req.formData();
    const arquivo = form.get("arquivo") as File | null;

    if (!arquivo) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // Sem checagem estrita de MIME aqui (navegadores relatam tipos inconsistentes para .xml) —
    // o conteúdo já é validado a seguir por assinatura ("<NFe"/"<nfeProc"); só limita tamanho.
    const erroArquivo = validarArquivos([arquivo], []);
    if (erroArquivo) return NextResponse.json({ error: erroArquivo }, { status: 422 });

    const texto = await arquivo.text();

    if (!texto.includes("<NFe") && !texto.includes("<nfeProc")) {
      return NextResponse.json(
        { error: "Arquivo não parece ser uma NF-e válida (XML NF-e)." },
        { status: 422 }
      );
    }

    const dados = parseNFeXML(texto);

    if (dados.itens.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto encontrado na nota fiscal." },
        { status: 422 }
      );
    }

    notificar({
      empresaId: session.empresaId,
      title:     "✅ Nota fiscal (XML) processada",
      body:      `${dados.itens.length} produto(s) encontrado(s)${dados.fornecedor ? ` — ${dados.fornecedor}` : ""}. Revise antes de confirmar.`,
      url:       "/nota-fiscal",
      tag:       "nota-fiscal-processada",
    });

    return NextResponse.json(dados);
  } catch (err) {
    console.error("Erro ao processar XML:", err);
    return NextResponse.json({ error: "Erro ao processar o arquivo XML." }, { status: 500 });
  }
}
