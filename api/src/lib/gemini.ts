import { GoogleGenerativeAI, GenerateContentResult } from "@google/generative-ai";

/**
 * Cada modelo tem sua própria cota diária gratuita, independente dos outros. Se o principal
 * bater no limite, tenta o próximo da lista automaticamente — na prática, soma as cotas de
 * vários modelos em vez de depender de um só.
 *
 * Ordem por cota diária (maior primeiro): os "flash-lite" 3.1/3.5 têm 500 req/dia cada,
 * bem mais que os demais (20/dia). Modelos sem capacidade confiável de leitura de documento
 * (ex: Gemma) ficam de fora — eles não seguem a instrução de retornar só JSON.
 */
const MODELOS_FALLBACK = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-3.6-flash",
];

function ehErroDeCota(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Too Many Requests");
}

/**
 * Gera conteúdo tentando cada modelo da lista em ordem. Só pula para o próximo quando o erro
 * é de cota esgotada — qualquer outro tipo de erro (arquivo inválido, etc.) já retorna na hora.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function gerarComFallback(genAI: GoogleGenerativeAI, partes: any[]): Promise<GenerateContentResult> {
  let ultimoErro: unknown;

  for (const nomeModelo of MODELOS_FALLBACK) {
    try {
      const model = genAI.getGenerativeModel({ model: nomeModelo });
      return await model.generateContent(partes);
    } catch (err) {
      ultimoErro = err;
      if (!ehErroDeCota(err)) throw err;
      console.error(`Cota esgotada em ${nomeModelo}, tentando próximo modelo…`);
    }
  }

  throw ultimoErro;
}
