import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSession } from "@/lib/auth";
import { notificar } from "@/lib/notify";
import { db } from "@/lib/db";

// ─── tipos ───────────────────────────────────────────────────────────────────

type ItemPedido = {
  produtoId: string;
  nome: string;
  quantidade: number;
  unidade: string;
};

type PedidoFornecedor = {
  fornecedorId: string;
  itens: ItemPedido[];
};

type ResultadoEnvio = {
  fornecedorId: string;
  fornecedorNome: string;
  whatsapp: "enviado" | "falhou" | "sem_numero" | null;
  email: "enviado" | "falhou" | "sem_email" | null;
  erro?: string;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function escaparHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatarMensagem(fornecedorNome: string, itensPedido: ItemPedido[]): string {
  const itens = itensPedido
    .map((it) => `• ${it.nome} — ${it.quantidade} ${it.unidade}`)
    .join("\n");

  const data = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    `Olá ${fornecedorNome}! 🛒\n\n` +
    `Segue nosso pedido de reposição:\n\n${itens}\n\n` +
    `Data: ${data}\n` +
    `Sistema: PedeFacil\n\n` +
    `Por favor confirme o recebimento. Obrigado!`
  );
}

async function enviarWhatsapp(numero: string, mensagem: string): Promise<void> {
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  const instancia = process.env.EVOLUTION_INSTANCE ?? "pedefacil";

  if (!url || !key) throw new Error("Evolution API não configurada.");

  const numeroLimpo = numero.replace(/\D/g, "");
  const numeroFinal = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;

  const res = await fetch(`${url}/message/sendText/${instancia}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
    },
    body: JSON.stringify({
      number: numeroFinal,
      text: mensagem,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Evolution API retornou ${res.status}: ${body}`);
  }
}

async function enviarEmail(destinatario: string, fornecedorNome: string, mensagem: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;

  if (!host || !user || !pass) throw new Error("SMTP não configurado.");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `PedeFacil <${from}>`,
    to: destinatario,
    subject: `Pedido de Reposição — ${new Date().toLocaleDateString("pt-BR")}`,
    text: mensagem,
    html: mensagem
      .split("\n")
      .map((l) => `<p style="margin:2px 0">${l ? escaparHtml(l) : "&nbsp;"}</p>`)
      .join(""),
  });
}

// ─── route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role === "operador") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { pedidos }: { pedidos: PedidoFornecedor[] } = await req.json();

  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    return NextResponse.json({ error: "Nenhum pedido enviado." }, { status: 400 });
  }

  // dispara todos em paralelo
  const resultados: ResultadoEnvio[] = await Promise.all(
    pedidos.map(async (pedido): Promise<ResultadoEnvio> => {
      // Busca o fornecedor no banco, escopado à empresa da sessão — nunca confia no
      // nome/telefone/e-mail que o cliente mandou. Isso evita que a rota seja usada como
      // relay pra mandar e-mail/WhatsApp pra um destinatário arbitrário não cadastrado.
      const fornecedor = await db.fornecedor.findFirst({
        where:  { id: pedido.fornecedorId, empresaId: session.empresaId },
        select: { id: true, nome: true, telefone: true, email: true },
      });

      if (!fornecedor) {
        return {
          fornecedorId:   pedido.fornecedorId,
          fornecedorNome: "—",
          whatsapp: null,
          email:    null,
          erro:     "Fornecedor não encontrado.",
        };
      }

      const itensValidos = Array.isArray(pedido.itens) ? pedido.itens : [];
      const mensagem = formatarMensagem(fornecedor.nome, itensValidos);
      const resultado: ResultadoEnvio = {
        fornecedorId:   fornecedor.id,
        fornecedorNome: fornecedor.nome,
        whatsapp: null,
        email:    null,
      };

      // WhatsApp
      if (fornecedor.telefone) {
        try {
          await enviarWhatsapp(fornecedor.telefone, mensagem);
          resultado.whatsapp = "enviado";
        } catch (e) {
          resultado.whatsapp = "falhou";
          console.error("Erro ao enviar WhatsApp:", e);
          resultado.erro = "Falha ao enviar mensagem via WhatsApp.";
        }
      } else {
        resultado.whatsapp = "sem_numero";
      }

      // Email
      if (fornecedor.email) {
        try {
          await enviarEmail(fornecedor.email, fornecedor.nome, mensagem);
          resultado.email = "enviado";
        } catch (e) {
          resultado.email = "falhou";
          console.error("Erro ao enviar e-mail:", e);
          resultado.erro = "Falha ao enviar e-mail.";
        }
      } else {
        resultado.email = "sem_email";
      }

      // Registra o pedido no histórico e marca os produtos como "aguardando entrega" —
      // só se algum canal realmente confirmou o envio, pra não esconder itens que falharam.
      // Em try/catch: a mensagem já foi enviada de verdade nesse ponto, então uma falha aqui
      // não pode virar erro 500 pro cliente (isso o levaria a clicar em enviar de novo e
      // duplicar o pedido pro fornecedor por causa de uma falha só no registro interno).
      if (resultado.whatsapp === "enviado" || resultado.email === "enviado") {
        try {
          await db.pedido.create({
            data: {
              empresaId:      session.empresaId,
              fornecedorId:   fornecedor.id,
              fornecedorNome: fornecedor.nome,
              itens:          JSON.stringify(itensValidos),
              whatsapp:       resultado.whatsapp,
              email:          resultado.email,
              enviadoPorNome: session.nome,
            },
          });

          const produtoIds = itensValidos.map((it) => it.produtoId).filter(Boolean);
          if (produtoIds.length > 0) {
            await db.produto.updateMany({
              where: { id: { in: produtoIds }, empresaId: session.empresaId },
              data:  { pedidoPendenteEm: new Date() },
            });
          }
        } catch (e) {
          console.error("Erro ao registrar histórico do pedido (mensagem já foi enviada):", e);
        }
      }

      return resultado;
    })
  );

  const totalEnviados = resultados.filter(
    (r) => r.whatsapp === "enviado" || r.email === "enviado"
  ).length;

  if (totalEnviados > 0) {
    notificar({
      empresaId: session.empresaId,
      roles:     ["admin", "gerente"],
      title:     "📋 Pedido enviado ao fornecedor",
      body:      totalEnviados === 1
        ? `Pedido enviado para ${resultados.find((r) => r.whatsapp === "enviado" || r.email === "enviado")?.fornecedorNome}`
        : `${totalEnviados} pedidos enviados a fornecedores`,
      url:       "/pedidos",
      tag:       "pedido-enviado",
    });
  }

  return NextResponse.json({ resultados, totalEnviados });
}
