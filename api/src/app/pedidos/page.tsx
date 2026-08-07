"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IconTruck, IconSmartphone, IconMail, IconCheckCircle, IconArrowUpCircle, IconAlertTriangle } from "../components/icons";
import { SkeletonTable } from "../components/Skeleton";

type Fornecedor = { id: string; nome: string; telefone: string | null; email: string | null };
type Produto = {
  id: string; nome: string; unidade: string;
  estoqueAtual: number; estoqueMinimo: number;
  estoqueAbaixoMinimo: boolean;
  pedidoPendenteEm: string | null;
  fornecedor: Fornecedor | null;
};
type ItemPedido  = { produto: Produto; quantidade: number };
type GrupoPedido = { fornecedor: Fornecedor | null; itens: ItemPedido[] };

function tempoDesde(data: string): string {
  const ms = Date.now() - new Date(data).getTime();
  const horas = Math.floor(ms / 3_600_000);
  if (horas < 1)  return "há poucos minutos";
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias !== 1 ? "s" : ""}`;
}

type StatusEnvio = {
  fornecedorId:   string;
  fornecedorNome: string;
  whatsapp: "enviado" | "falhou" | "sem_numero" | null;
  email:    "enviado" | "falhou" | "sem_email"  | null;
  erro?: string;
};

export default function PedidosPage() {
  const [grupos,      setGrupos]      = useState<GrupoPedido[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [enviando,    setEnviando]    = useState(false);
  const [resultados,  setResultados]  = useState<StatusEnvio[] | null>(null);

  const carregar = async () => {
    const produtos: Produto[] = await fetch("/api/produtos").then((r) => r.json());
    const emAlerta = produtos.filter((p) => p.estoqueAbaixoMinimo);
    const mapa = new Map<string, GrupoPedido>();

    for (const p of emAlerta) {
      const chave = p.fornecedor?.id ?? "__sem_fornecedor__";
      if (!mapa.has(chave)) mapa.set(chave, { fornecedor: p.fornecedor, itens: [] });
      const qtdSugerida = Math.max(p.estoqueMinimo - p.estoqueAtual, 1);
      mapa.get(chave)!.itens.push({ produto: p, quantidade: qtdSugerida });
    }

    const lista = Array.from(mapa.values()).sort((a, b) => {
      if (!a.fornecedor) return 1;
      if (!b.fornecedor) return -1;
      return a.fornecedor.nome.localeCompare(b.fornecedor.nome);
    });

    setGrupos(lista);
    const qtds: Record<string, number> = {};
    for (const g of lista)
      for (const it of g.itens)
        qtds[it.produto.id] = it.quantidade;
    setQuantidades(qtds);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const setQtd = (id: string, v: number) =>
    setQuantidades((prev) => ({ ...prev, [id]: v }));

  const enviarTodos = async () => {
    const pedidos = grupos
      .filter((g) => g.fornecedor)
      .map((g) => ({
        fornecedorId:   g.fornecedor!.id,
        fornecedorNome: g.fornecedor!.nome,
        whatsapp: g.fornecedor!.telefone,
        email:    g.fornecedor!.email,
        itens: g.itens
          .filter((it) => (quantidades[it.produto.id] ?? 0) > 0)
          .map((it) => ({
            produtoId:  it.produto.id,
            nome:       it.produto.nome,
            quantidade: quantidades[it.produto.id],
            unidade:    it.produto.unidade,
          })),
      }))
      .filter((p) => p.itens.length > 0);

    if (pedidos.length === 0) return;

    // Só considera duplicidade pros itens que realmente vão nesse envio (com quantidade > 0),
    // não em todos os grupos carregados — senão um item parado (qtd zerada) ou o grupo "sem
    // fornecedor" (que nunca é enviado) dispararia um aviso de duplicidade falso.
    const produtoIdsDoEnvio = new Set(pedidos.flatMap((p) => p.itens.map((it) => it.produtoId)));
    const jaPedidos = grupos.some((g) =>
      g.itens.some((it) => produtoIdsDoEnvio.has(it.produto.id) && it.produto.pedidoPendenteEm)
    );
    if (jaPedidos) {
      const confirmar = window.confirm(
        "Alguns itens já têm um pedido enviado recentemente, ainda aguardando entrega. Enviar mesmo assim (pode duplicar o pedido)?"
      );
      if (!confirmar) return;
    }

    setEnviando(true);
    setResultados(null);
    const res  = await fetch("/api/pedidos/enviar", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ pedidos }),
    });
    const data = await res.json();
    setResultados(data.resultados ?? []);
    setEnviando(false);
    // Recarrega — sem isso, `pedidoPendenteEm` fica desatualizado em memória e tanto o selo
    // visual quanto a checagem de duplicidade acima ficam sem efeito até o usuário dar F5.
    await carregar();
  };

  const totalItens = grupos.reduce((acc, g) => acc + g.itens.length, 0);
  const fornecedoresComContato = grupos.filter(
    (g) => g.fornecedor?.telefone || g.fornecedor?.email
  ).length;

  const badgeStatus = (v: StatusEnvio["whatsapp"] | StatusEnvio["email"], tipo: "whatsapp" | "email") => {
    const Icone = tipo === "whatsapp" ? IconSmartphone : IconMail;
    if (v === "enviado")    return <span className="badge badge-ok"><Icone size={12} /> Enviado</span>;
    if (v === "falhou")     return <span className="badge badge-alerta"><Icone size={12} /> Falhou</span>;
    if (v === "sem_numero") return <span className="badge badge-gray"><IconSmartphone size={12} /> Sem número</span>;
    if (v === "sem_email")  return <span className="badge badge-gray"><IconMail size={12} /> Sem e-mail</span>;
    return null;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Pedidos para Fornecedores</div>
          <div className="page-subtitle">
            {loading ? "Carregando…" : `${totalItens} produto(s) precisam de reposição`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/pedidos/historico" className="btn btn-secondary btn-sm"><IconCheckCircle size={14} /> Histórico</Link>
          <Link href="/fornecedores" className="btn btn-secondary btn-sm"><IconTruck size={14} /> Fornecedores</Link>
        </div>
      </div>

      <div className="page-content">

        {/* Banner */}
        <div style={{ borderRadius: 16, padding: "24px 28px", background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Pedidos Automáticos</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Peça o que está faltando</div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6, maxWidth: 340 }}>
              Revise as quantidades e clique em <strong>Enviar Todos</strong>. Os pedidos são disparados simultaneamente para cada fornecedor pelo WhatsApp e e-mail — sem redirecionamento.
            </div>
          </div>
          <svg width="110" height="90" viewBox="0 0 110 90" fill="none" style={{ flexShrink: 0 }}>
            <rect x="5"  y="42" width="62" height="32" rx="5" fill="#A7F3D0"/>
            <rect x="57" y="50" width="28" height="24" rx="5" fill="#6EE7B7"/>
            <rect x="60" y="53" width="22" height="14" rx="3" fill="#ECFDF5" opacity="0.8"/>
            <circle cx="18" cy="76" r="7" fill="#059669"/><circle cx="18" cy="76" r="3" fill="#ECFDF5"/>
            <circle cx="54" cy="76" r="7" fill="#059669"/><circle cx="54" cy="76" r="3" fill="#ECFDF5"/>
            <circle cx="78" cy="76" r="7" fill="#059669"/><circle cx="78" cy="76" r="3" fill="#ECFDF5"/>
            <rect x="12" y="50" width="38" height="3" rx="2" fill="#34D399" opacity="0.6"/>
            <rect x="12" y="57" width="28" height="3" rx="2" fill="#34D399" opacity="0.6"/>
            <rect x="12" y="64" width="32" height="3" rx="2" fill="#34D399" opacity="0.6"/>
          </svg>
        </div>

        {loading && <div className="card"><SkeletonTable rows={4} cols={4} /></div>}

        {!loading && totalItens === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><IconCheckCircle size={36} /></div>
            <p style={{ fontWeight: 600 }}>Tudo em dia!</p>
            <small>Nenhum produto está abaixo do estoque mínimo.</small>
          </div>
        )}

        {/* Resultado dos envios */}
        {resultados && (
          <div className="card" style={{ marginBottom: 20, border: "2px solid var(--primary)" }}>
            <div className="card-header">
              <span className="card-title">Resultado dos Envios</span>
              <span className="badge badge-ok">
                {resultados.filter((r) => r.whatsapp === "enviado" || r.email === "enviado").length} de {resultados.length} enviados
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Fornecedor</th><th>WhatsApp</th><th>E-mail</th><th>Obs.</th></tr>
                </thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={r.fornecedorId}>
                      <td style={{ fontWeight: 600 }}>{r.fornecedorNome}</td>
                      <td>{badgeStatus(r.whatsapp, "whatsapp")}</td>
                      <td>{badgeStatus(r.email, "email")}</td>
                      <td style={{ fontSize: 12, color: "var(--danger)" }}>{r.erro ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Botão enviar todos */}
        {!loading && totalItens > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, gap: 10, alignItems: "center" }}>
            {fornecedoresComContato === 0 && (
              <span style={{ fontSize: 13, color: "var(--text-3)" }}>
                Nenhum fornecedor tem WhatsApp ou e-mail cadastrado.{" "}
                <Link href="/fornecedores" style={{ color: "var(--primary)" }}>Cadastrar →</Link>
              </span>
            )}
            <button
              className="btn btn-primary"
              onClick={enviarTodos}
              disabled={enviando || fornecedoresComContato === 0}
              style={{ minWidth: 200 }}
            >
              {enviando
                ? "Enviando para todos…"
                : <><IconArrowUpCircle size={16} /> Enviar Todos ({fornecedoresComContato} fornecedor{fornecedoresComContato !== 1 ? "es" : ""})</>}
            </button>
          </div>
        )}

        {/* Cards por fornecedor */}
        {grupos.map((grupo, gi) => (
          <div key={gi} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {grupo.fornecedor ? <><IconTruck size={15} /> {grupo.fornecedor.nome}</> : <><IconAlertTriangle size={15} /> Sem fornecedor definido</>}
                </span>
                {grupo.fornecedor && (
                  <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 13, color: "var(--text-3)" }}>
                    {grupo.fornecedor.telefone
                      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconSmartphone size={13} /> {grupo.fornecedor.telefone}</span>
                      : <span style={{ color: "var(--danger)", display: "inline-flex", alignItems: "center", gap: 5 }}><IconSmartphone size={13} /> Sem WhatsApp</span>}
                    {grupo.fornecedor.email
                      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconMail size={13} /> {grupo.fornecedor.email}</span>
                      : <span style={{ color: "var(--danger)", display: "inline-flex", alignItems: "center", gap: 5 }}><IconMail size={13} /> Sem e-mail</span>}
                  </div>
                )}
                {!grupo.fornecedor && (
                  <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
                    Vincule esses produtos a um fornecedor em{" "}
                    <Link href="/produtos" style={{ color: "var(--primary)" }}>Produtos</Link>
                  </div>
                )}
              </div>
              {grupo.itens.every((it) => it.produto.pedidoPendenteEm)
                ? <span className="badge badge-ok"><IconCheckCircle size={12} /> Pedido Enviado</span>
                : <span className="badge badge-alerta">{grupo.itens.length} item(s)</span>}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Estoque atual</th>
                    <th>Mínimo</th>
                    <th>Qtd. pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.itens.map((it) => (
                    <tr key={it.produto.id}>
                      <td style={{ fontWeight: 600 }}>
                        {it.produto.nome}
                        {it.produto.pedidoPendenteEm && (
                          <div style={{ marginTop: 3 }}>
                            <span className="badge badge-gray" style={{ fontSize: 11 }}>
                              Pedido enviado {tempoDesde(it.produto.pedidoPendenteEm)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="stock-warn">{it.produto.estoqueAtual} <span style={{ color: "var(--text-3)", fontSize: 12 }}>{it.produto.unidade}</span></td>
                      <td style={{ color: "var(--text-2)" }}>{it.produto.estoqueMinimo}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            type="number"
                            min="0"
                            value={quantidades[it.produto.id] ?? it.quantidade}
                            onChange={(e) => setQtd(it.produto.id, Number(e.target.value))}
                            style={{ width: 72, padding: "5px 8px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 14, background: "var(--surface-2)", color: "var(--text-1)" }}
                          />
                          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{it.produto.unidade}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      </div>
    </>
  );
}
