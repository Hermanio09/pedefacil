import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSession } from "@/lib/auth";
import { notificar } from "@/lib/notify";
import { gerarComFallback } from "@/lib/gemini";
import { TIPOS_IMAGEM_PDF, validarArquivos } from "@/lib/uploads";
import { rateLimit } from "@/lib/rate-limit";

const PROMPT_BASE = `Você é um especialista em leitura de notas fiscais e cupons fiscais brasileiros.

Analise este documento e extraia todas as informações dos produtos listados.

Retorne APENAS um JSON válido, sem texto adicional, sem markdown, sem blocos de código, no seguinte formato:
{
  "fornecedor": "nome da empresa emitente da nota (ou null se não encontrar)",
  "dataEmissao": "data no formato YYYY-MM-DD (ou null se não encontrar)",
  "valorTotal": 0.00,
  "itens": [
    {
      "nome": "nome do produto conforme aparece na nota",
      "quantidade": 1,
      "unidade": "UN",
      "precoUnitario": 0.00,
      "total": 0.00
    }
  ]
}

Regras importantes:
- Para unidade, use apenas: UN, KG, CX, PCT, FD, LT, GL, SC, BAR, MT — escolha a mais adequada
- Se não encontrar o preço, use 0
- Se não encontrar a quantidade, use 1
- Inclua TODOS os produtos da nota, sem pular nenhum
- Nome do produto: use o nome completo como está na nota
- Se for um cupom fiscal simplificado, extraia o que for possível`;

const PROMPT_UNICA   = PROMPT_BASE;
const PROMPT_MULTIPAGINA = PROMPT_BASE + `

ATENÇÃO: As imagens a seguir são PÁGINAS DIFERENTES da mesma nota fiscal. Consolide todos os produtos de todas as páginas em um único JSON. Não duplique produtos que aparecem em mais de uma página.`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  if (!process.env.GOOGLE_AI_KEY) {
    console.error("GOOGLE_AI_KEY não configurada no .env.local.");
    return NextResponse.json(
      { error: "Não foi possível analisar o documento no momento. Tente novamente mais tarde." },
      { status: 500 }
    );
  }

  // Cada chamada aqui consome cota da API de análise — sem isso, uma sessão válida (ou roubada)
  // poderia esgotar a cota compartilhada do dia inteiro só de si.
  const rl = rateLimit(`nota-fiscal-imagem:${session.userId}`, 50, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas análises em pouco tempo. Aguarde ${Math.ceil(rl.resetIn / 60000)} minuto(s) e tente novamente.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  try {
    const form     = await req.formData();
    const arquivos = form.getAll("arquivo") as File[];

    if (!arquivos.length) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const erroArquivo = validarArquivos(arquivos, TIPOS_IMAGEM_PDF);
    if (erroArquivo) return NextResponse.json({ error: erroArquivo }, { status: 422 });

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

    const prompt = arquivos.length > 1 ? PROMPT_MULTIPAGINA : PROMPT_UNICA;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const partes: any[] = [prompt];
    for (const arq of arquivos) {
      const buffer = await arq.arrayBuffer();
      partes.push({ inlineData: { mimeType: arq.type as string, data: Buffer.from(buffer).toString("base64") } });
    }

    const resultado = await gerarComFallback(genAI, partes);

    const texto = resultado.response.text().trim();

    // Remove possível markdown do modelo
    const limpo = texto.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    const jsonMatch = limpo.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Não foi possível extrair produtos. Tente com uma foto mais nítida ou um PDF melhor qualidade." },
        { status: 422 }
      );
    }

    const dados = JSON.parse(jsonMatch[0]);

    if (!dados.itens || dados.itens.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto encontrado no documento." },
        { status: 422 }
      );
    }

    notificar({
      empresaId: session.empresaId,
      title:     "✅ Nota fiscal processada",
      body:      `${dados.itens.length} produto(s) encontrado(s)${dados.fornecedor ? ` — ${dados.fornecedor}` : ""}. Revise antes de confirmar.`,
      url:       "/nota-fiscal",
      tag:       "nota-fiscal-processada",
    });

    return NextResponse.json({
      itens:       dados.itens,
      fornecedor:  dados.fornecedor  ?? null,
      dataEmissao: dados.dataEmissao ?? null,
      valorTotal:  dados.valorTotal  ?? 0,
    });
  } catch (err) {
    console.error("Erro ao analisar documento:", err);
    return NextResponse.json({ error: "Erro ao analisar o documento. Tente novamente em instantes." }, { status: 500 });
  }
}
