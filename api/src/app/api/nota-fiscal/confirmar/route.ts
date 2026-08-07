import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { validarArquivosNotaFiscal } from "@/lib/uploads";

type ItemConfirmar   = { nome: string; quantidade: number; unidade: string; precoUnitario?: number; produtoId?: string };
type FornecedorInput = { nome: string; telefone?: string; email?: string } | null;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let itens: ItemConfirmar[];
    let fornecedorInput: FornecedorInput;
    let tipo = "manual";
    let valorTotal = 0;
    let dataEmissao: string | null = null;
    let arquivos: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      itens           = JSON.parse((form.get("itens") as string) ?? "[]");
      fornecedorInput = JSON.parse((form.get("fornecedor") as string) ?? "null");
      tipo            = (form.get("tipo") as string) ?? "manual";
      valorTotal      = Number(form.get("valorTotal") ?? 0) || 0;
      dataEmissao     = (form.get("dataEmissao") as string) || null;
      arquivos        = form.getAll("arquivo") as File[];

      // Esta rota é quem de fato grava os bytes do arquivo no banco — precisa da mesma
      // checagem de quantidade/tamanho que a rota de análise já faz, mesmo que este passo
      // seja chamado direto (sem passar pela análise antes).
      const erroArquivo = validarArquivosNotaFiscal(arquivos);
      if (erroArquivo) return NextResponse.json({ error: erroArquivo }, { status: 422 });
    } else {
      const body = await req.json();
      itens = body.itens;
      fornecedorInput = body.fornecedor;
    }

    if (!itens?.length) return NextResponse.json({ error: "Nenhum item para confirmar." }, { status: 400 });

    const eid = session.empresaId;
    let fornecedorId: string | null = null;

    if (fornecedorInput?.nome?.trim()) {
      const nomeFornecedor = fornecedorInput.nome.trim();

      // Busca + criação na mesma transação: o SQLite serializa transações de escrita
      // concorrentes, então duas confirmações do mesmo fornecedor ao mesmo tempo (ex.: Modo
      // Lote, ou dois usuários confirmando notas juntos) não conseguem mais criar duplicatas —
      // a segunda transação só começa depois que a primeira já commitou a criação.
      fornecedorId = await db.$transaction(async (tx) => {
        const todos     = await tx.fornecedor.findMany({ where: { empresaId: eid }, select: { id: true, nome: true } });
        const existente = todos.find((f) => f.nome.toLowerCase() === nomeFornecedor.toLowerCase());

        if (existente) {
          await tx.fornecedor.update({
            where: { id: existente.id },
            data:  { telefone: fornecedorInput.telefone?.trim() || undefined, email: fornecedorInput.email?.trim() || undefined },
          });
          return existente.id;
        }

        const novo = await tx.fornecedor.create({
          data: { empresaId: eid, nome: nomeFornecedor, telefone: fornecedorInput.telefone?.trim() || null, email: fornecedorInput.email?.trim() || null },
        });
        return novo.id;
      });
    }

    let criados = 0;
    const erros: string[] = [];

    for (const item of itens) {
      try {
        let produtoId = item.produtoId;
        const preco   = item.precoUnitario && item.precoUnitario > 0 ? item.precoUnitario : undefined;

        // Se um produtoId foi enviado pelo cliente, confirma que pertence à empresa logada
        // antes de usá-lo — evita que alguém injete o id de produto de outra empresa.
        if (produtoId) {
          const pertence = await db.produto.findFirst({ where: { id: produtoId, empresaId: eid }, select: { id: true } });
          if (!pertence) produtoId = undefined;
        }

        if (!produtoId) {
          // Mesma lógica do fornecedor acima: busca + criação em uma única transação para
          // que confirmações concorrentes do mesmo produto não criem registros duplicados.
          produtoId = await db.$transaction(async (tx) => {
            const todos = await tx.produto.findMany({ where: { empresaId: eid }, select: { id: true, nome: true, fornecedorId: true } });
            const match = todos.find((p) => p.nome.toLowerCase() === item.nome.toLowerCase());

            if (match) {
              await tx.produto.update({
                where: { id: match.id },
                data: {
                  ...(fornecedorId && !match.fornecedorId ? { fornecedorId } : {}),
                  ...(preco ? { precoUnitario: preco } : {}),
                },
              });
              return match.id;
            }

            const novo = await tx.produto.create({
              data: {
                empresaId:     eid,
                nome:          item.nome.trim(),
                unidade:       item.unidade.toUpperCase(),
                estoqueAtual:  0,
                estoqueMinimo: 5,
                precoUnitario: preco ?? 0,
                fornecedorId,
              },
            });
            return novo.id;
          });
        } else {
          await db.produto.update({
            where: { id: produtoId },
            data: {
              ...(fornecedorId ? { fornecedorId } : {}),
              ...(preco        ? { precoUnitario: preco } : {}),
            },
          });
        }

        const quantidadeBruta = Number(item.quantidade);
        const quantidade = quantidadeBruta > 0 ? quantidadeBruta : 1;
        await db.$transaction([
          db.movimentacao.create({
            data: {
              empresaId:       eid,
              produtoId:       produtoId!,
              tipo:            "entrada",
              quantidade,
              precoUnitario:   preco ?? 0,
              estoquePositivo: true,
              observacao:      "Importado via Nota Fiscal",
            },
          }),
          db.produto.update({
            where: { id: produtoId! },
            data:  { estoqueAtual: { increment: quantidade }, pedidoPendenteEm: null },
          }),
        ]);
        criados++;
      } catch (e) {
        erros.push(`Erro em "${item.nome}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (criados > 0 && ["pdf", "imagem", "xml"].includes(tipo)) {
      const notaFiscal = await db.notaFiscal.create({
        data: {
          empresaId:      eid,
          usuarioId:      session.userId,
          tipo,
          fornecedorNome: fornecedorInput?.nome?.trim() || null,
          valorTotal,
          dataEmissao:    dataEmissao ? new Date(dataEmissao) : null,
          qtdItens:       criados,
        },
      });

      for (let i = 0; i < arquivos.length; i++) {
        const buffer = Buffer.from(await arquivos[i].arrayBuffer());
        await db.notaFiscalArquivo.create({
          data: {
            notaFiscalId: notaFiscal.id,
            nome:         arquivos[i].name || `pagina-${i + 1}`,
            mimeType:     arquivos[i].type || "application/octet-stream",
            ordem:        i,
            dados:        buffer,
          },
        });
      }
    }

    return NextResponse.json({ criados, erros });
  } catch (e) {
    console.error("Erro ao processar nota fiscal:", e);
    return NextResponse.json({ error: "Erro interno ao processar a nota." }, { status: 500 });
  }
}
