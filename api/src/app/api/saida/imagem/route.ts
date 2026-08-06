import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { melhorCorrespondencia } from "@/lib/fuzzy";
import { gerarComFallback } from "@/lib/gemini";
import { TIPOS_IMAGEM_PDF, validarArquivos } from "@/lib/uploads";
import { rateLimit } from "@/lib/rate-limit";

const PROMPT = `Você é um especialista em ler listas manuscritas ou impressas de itens usados/retirados do estoque de um bar ou restaurante.

Analise a(s) imagem(ns) a seguir — pode ser uma lista escrita à mão pela equipe listando o que foi consumido, vendido ou retirado do estoque.

Retorne APENAS um JSON válido, sem texto adicional, sem markdown, no seguinte formato:
{
  "itens": [
    { "nome": "nome do produto conforme está escrito", "quantidade": 1, "unidade": "UN" }
  ]
}

Regras importantes:
- Para unidade, use apenas: UN, KG, CX, PCT, FD, LT, GL, SC, BAR, MT — escolha a mais adequada (se não tiver certeza, use UN)
- Se não encontrar a quantidade escrita, use 1
- Inclua TODOS os itens da lista, sem pular nenhum
- Transcreva o nome exatamente como está escrito, mesmo que a letra seja difícil — faça sua melhor interpretação
- Ignore riscos, rabiscos ou itens claramente cortados/cancelados na lista
- Se houver múltiplas imagens, são páginas diferentes da MESMA lista — consolide tudo, sem duplicar itens que aparecem em mais de uma página`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (!process.env.GOOGLE_AI_KEY) {
    console.error("GOOGLE_AI_KEY não configurada no .env.local.");
    return NextResponse.json(
      { error: "Não foi possível analisar o documento no momento. Tente novamente mais tarde." },
      { status: 500 }
    );
  }

  const rl = rateLimit(`saida-imagem:${session.userId}`, 50, 10 * 60 * 1000);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const partes: any[] = [PROMPT];
    for (const arq of arquivos) {
      const buffer = await arq.arrayBuffer();
      partes.push({ inlineData: { mimeType: arq.type as string, data: Buffer.from(buffer).toString("base64") } });
    }

    const resultado = await gerarComFallback(genAI, partes);
    const texto = resultado.response.text().trim();
    const limpo = texto.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    const jsonMatch = limpo.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Não foi possível ler a lista. Tente com uma foto mais nítida." },
        { status: 422 }
      );
    }

    const dados = JSON.parse(jsonMatch[0]) as { itens: { nome: string; quantidade: number; unidade: string }[] };
    if (!dados.itens || dados.itens.length === 0) {
      return NextResponse.json({ error: "Nenhum item encontrado na lista." }, { status: 422 });
    }

    const produtos = await db.produto.findMany({
      where:  { empresaId: session.empresaId },
      select: { id: true, nome: true, unidade: true, estoqueAtual: true, estoqueMinimo: true },
    });

    const itensComCorrespondencia = dados.itens.map((item) => {
      const match = melhorCorrespondencia(item.nome, produtos, (p) => p.nome);
      return {
        nomeLido:     item.nome,
        quantidade:   item.quantidade ?? 1,
        unidade:      item.unidade ?? "UN",
        produtoId:    match?.item.id ?? null,
        produtoNome:  match?.item.nome ?? null,
        estoqueAtual: match?.item.estoqueAtual ?? null,
        confianca:    match?.confianca ?? 0,
      };
    });

    return NextResponse.json({ itens: itensComCorrespondencia, produtosDisponiveis: produtos });
  } catch (err) {
    console.error("Erro ao analisar lista com Gemini:", err);
    return NextResponse.json({ error: "Erro ao analisar o documento." }, { status: 500 });
  }
}
