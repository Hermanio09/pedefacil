# Texto sugerido — processamento de documentos por terceiro (LGPD)

Este arquivo é um rascunho de cláusula para você incluir na sua Política de Privacidade
e/ou Termos de Uso. **Não é um documento jurídico pronto** — recomendo que um advogado
revise antes de publicar, especialmente os pontos sobre base legal e retenção de dados.

Contexto técnico (para você e para quem for revisar): quando um usuário envia uma foto ou
PDF de nota fiscal para leitura automática, o arquivo é enviado para a API do Gemini
(Google) para extração dos dados. O texto/imagem cru do documento passa pelos servidores do
Google nesse processo. Isso não acontece com o modo de importação por XML (que é processado
localmente, sem terceiros). Isso está documentado no código em `src/lib/gemini.ts` e nas
rotas `src/app/api/nota-fiscal/imagem/route.ts` e `src/app/api/saida/imagem/route.ts`.

---

## Sugestão de cláusula

### Processamento de documentos por terceiros

Ao utilizar a funcionalidade de leitura automática de notas fiscais e listas por foto ou
PDF, o(s) arquivo(s) enviado(s) são processados por um serviço de terceiro especializado em
análise de documentos e imagens (Google LLC, através da API Gemini), com a finalidade
exclusiva de extrair automaticamente as informações de produtos, quantidades, preços e
fornecedores contidas no documento.

Esse processamento:

- é realizado sob demanda, apenas quando o usuário opta por usar essa funcionalidade;
- envolve o conteúdo do documento (imagem ou PDF) e o texto nele extraído;
- é regido pelos termos de proteção de dados do Google para a API Gemini (ver
  [Termos de Serviço da API Gemini](https://ai.google.dev/gemini-api/terms) e a
  [Política de Privacidade do Google](https://policies.google.com/privacy));
- **não** ocorre na importação por arquivo XML de NF-e, que é processada localmente, sem
  envio a terceiros.

O documento original enviado é armazenado em nossos servidores para consulta futura pelo
próprio usuário/empresa, e não é compartilhado com outros clientes ou empresas na
plataforma.

Se o documento contiver dados pessoais (ex: nome de pessoa física em vez de razão social,
CPF em vez de CNPJ), esses dados também serão processados nos termos acima.

---

## Pontos que valem uma conversa com um advogado

1. **Base legal LGPD** para esse tratamento (provavelmente execução de contrato/legítimo
   interesse, mas depende de como você desenha o restante da política).
2. **Transferência internacional de dados** — os servidores do Google podem processar fora
   do Brasil; a LGPD tem regras específicas para isso (art. 33).
3. **Tempo de retenção** dos arquivos de nota fiscal armazenados no banco (hoje não há
   exclusão automática — ficam indefinidamente até o usuário excluir, se essa opção
   existir).
4. Se pretende comercializar para clientes fora do seu controle direto, considere adicionar
   um **DPA (Data Processing Addendum)** com o Google como subprocessador, e listar isso
   nos termos que seus próprios clientes assinam.
