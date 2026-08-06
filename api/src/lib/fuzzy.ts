export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distanciaLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let anterior = Array.from({ length: n + 1 }, (_, i) => i);
  let atual = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    atual[0] = i;
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(
        anterior[j] + 1,
        atual[j - 1] + 1,
        anterior[j - 1] + custo
      );
    }
    [anterior, atual] = [atual, anterior];
  }
  return anterior[n];
}

function similaridade(a: string, b: string): number {
  const distancia = distanciaLevenshtein(a, b);
  const maiorTamanho = Math.max(a.length, b.length);
  if (maiorTamanho === 0) return 1;
  return 1 - distancia / maiorTamanho;
}

const PALAVRAS_IGNORADAS = new Set(["de", "da", "do", "das", "dos", "e", "com", "para", "a", "o"]);

const PALAVRAS_GENERICAS = new Set([
  "lata", "latas", "garrafa", "garrafas", "caixa", "caixas", "pacote", "pacotes",
  "fardo", "fardos", "litro", "litros", "unidade", "unidades", "ml", "un", "cx",
  "pct", "fd", "lt", "gl", "sc", "bar", "mt", "kg", "l",
]);

function tokenizar(s: string): string[] {
  return s.split(" ").filter((t) => t && !PALAVRAS_IGNORADAS.has(t));
}

/** Palavras de embalagem/medida (ex: "lata", "350ml") pesam pouco — o que identifica o
 *  produto de verdade é o nome/marca, não a embalagem, que costuma se repetir entre itens. */
function pesoToken(token: string): number {
  if (PALAVRAS_GENERICAS.has(token)) return 0.3;
  if (/^\d+([.,]\d+)?(ml|l|kg|g|un|cx)?$/.test(token)) return 0.3;
  return 1;
}

/**
 * Compara duas listas de palavras. Cada palavra do termo busca a palavra mais parecida no
 * candidato (tolerando erros de digitação via Levenshtein); só conta "acerto" se a palavra
 * bater quase inteira. Palavras genéricas de embalagem/medida contam menos, para evitar que
 * produtos diferentes que só compartilham a embalagem (ex: "lata 350ml") sejam confundidos.
 */
function scoreTokens(termoTokens: string[], candidatoTokens: string[]): number {
  if (!termoTokens.length) return 0;
  let somaPontos = 0;
  let somaPesos = 0;
  for (const t of termoTokens) {
    const peso = pesoToken(t);
    let melhorTokenScore = 0;
    for (const c of candidatoTokens) {
      if (t === c) { melhorTokenScore = 1; break; }
      const sim = similaridade(t, c);
      if (sim > melhorTokenScore) melhorTokenScore = sim;
    }
    const pontuacao = melhorTokenScore >= 0.75 ? 1 : melhorTokenScore * 0.25;
    somaPontos += pontuacao * peso;
    somaPesos += peso;
  }
  return somaPesos > 0 ? somaPontos / somaPesos : 0;
}

/** Encontra o item cujo nome mais se parece com `termo`. Retorna null se nada passar do limiar mínimo. */
export function melhorCorrespondencia<T>(
  termo: string,
  itens: T[],
  getNome: (item: T) => string,
  limiarMinimo = 0.5
): { item: T; confianca: number } | null {
  const termoNorm = normalizar(termo);
  if (!termoNorm) return null;
  const termoTokens = tokenizar(termoNorm);

  let melhor: { item: T; confianca: number } | null = null;

  for (const item of itens) {
    const nomeNorm = normalizar(getNome(item));
    if (!nomeNorm) continue;
    const candidatoTokens = tokenizar(nomeNorm);

    // Média entre "quanto do termo está no candidato" e "quanto do candidato está no termo",
    // para não favorecer nomes de catálogo muito mais longos/curtos que o termo lido.
    const scoreTermoEmCandidato = scoreTokens(termoTokens, candidatoTokens);
    const scoreCandidatoEmTermo = scoreTokens(candidatoTokens, termoTokens);
    const score = (scoreTermoEmCandidato * 2 + scoreCandidatoEmTermo) / 3;

    if (!melhor || score > melhor.confianca) melhor = { item, confianca: score };
  }

  if (!melhor || melhor.confianca < limiarMinimo) return null;
  return melhor;
}
