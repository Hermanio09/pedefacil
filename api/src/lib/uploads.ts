export const TIPOS_IMAGEM     = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const TIPOS_PDF        = ["application/pdf"];
export const TIPOS_XML        = ["application/xml", "text/xml"];
export const TIPOS_IMAGEM_PDF = [...TIPOS_IMAGEM, ...TIPOS_PDF];
export const TIPOS_NOTA_FISCAL = [...TIPOS_IMAGEM_PDF, ...TIPOS_XML];

export const MAX_ARQUIVOS         = 10;
export const MAX_TAMANHO_ARQUIVO  = 8 * 1024 * 1024; // 8MB por arquivo

/** Valida quantidade, tamanho e tipo MIME de uma lista de arquivos enviados. Retorna uma
 * mensagem de erro (para devolver ao cliente) ou null se estiver tudo certo. */
export function validarArquivos(arquivos: File[], tiposAceitos: string[]): string | null {
  if (arquivos.length > MAX_ARQUIVOS) return `Máximo de ${MAX_ARQUIVOS} arquivos por vez.`;

  for (const arq of arquivos) {
    if (arq.size > MAX_TAMANHO_ARQUIVO) {
      return `Arquivo "${arq.name}" excede o limite de ${MAX_TAMANHO_ARQUIVO / (1024 * 1024)}MB.`;
    }
    if (tiposAceitos.length && !tiposAceitos.includes(arq.type)) {
      return `Formato não suportado: "${arq.name}".`;
    }
  }

  return null;
}

/** Mesma validação de quantidade/tamanho de `validarArquivos`, mas com tipo aceitando
 * imagem, PDF ou XML — usado na confirmação da nota fiscal, que pode receber qualquer um dos
 * três conforme o modo usado na análise. Navegadores às vezes não reportam um MIME type útil
 * pra .xml (string vazia ou "application/octet-stream"), então nesse caso cai para checar a
 * extensão do nome do arquivo em vez de rejeitar um upload legítimo. */
export function validarArquivosNotaFiscal(arquivos: File[]): string | null {
  if (arquivos.length > MAX_ARQUIVOS) return `Máximo de ${MAX_ARQUIVOS} arquivos por vez.`;

  for (const arq of arquivos) {
    if (arq.size > MAX_TAMANHO_ARQUIVO) {
      return `Arquivo "${arq.name}" excede o limite de ${MAX_TAMANHO_ARQUIVO / (1024 * 1024)}MB.`;
    }

    const tipoConhecido = TIPOS_IMAGEM_PDF.includes(arq.type) || TIPOS_XML.includes(arq.type);
    const provavelXmlSemMime =
      arq.name.toLowerCase().endsWith(".xml") && (arq.type === "" || arq.type === "application/octet-stream");

    if (!tipoConhecido && !provavelXmlSemMime) {
      return `Formato não suportado: "${arq.name}".`;
    }
  }

  return null;
}
