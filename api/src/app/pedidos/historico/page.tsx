"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { IconClipboardList, IconSmartphone, IconMail, IconChevronDown, IconInbox } from "../../components/icons";
import { SkeletonTable } from "../../components/Skeleton";

type ItemPedido = { produtoId: string; nome: string; quantidade: number; unidade: string };
type Pedido = {
  id: string;
  fornecedorNome: string;
  itens: ItemPedido[];
  whatsapp: "enviado" | "falhou" | "sem_numero" | null;
  email:    "enviado" | "falhou" | "sem_email"  | null;
  enviadoPorNome: string;
  criadoEm: string;
};

const fmtData = (v: string) => new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const badgeStatus = (v: Pedido["whatsapp"] | Pedido["email"], tipo: "whatsapp" | "email") => {
  const Icone = tipo === "whatsapp" ? IconSmartphone : IconMail;
  if (v === "enviado")    return <span className="badge badge-ok"><Icone size={12} /> Enviado</span>;
  if (v === "falhou")     return <span className="badge badge-alerta"><Icone size={12} /> Falhou</span>;
  if (v === "sem_numero") return <span className="badge badge-gray"><IconSmartphone size={12} /> Sem número</span>;
  if (v === "sem_email")  return <span className="badge badge-gray"><IconMail size={12} /> Sem e-mail</span>;
  return null;
};

export default function HistoricoPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pedidos")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { setPedidos(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Pedidos Enviados</div>
          <div className="page-subtitle">{loading ? "Carregando…" : `${pedidos.length} pedido(s) no histórico`}</div>
        </div>
        <Link href="/pedidos" className="btn btn-secondary btn-sm"><IconClipboardList size={14} /> Voltar</Link>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="card"><SkeletonTable rows={5} cols={5} /></div>
        ) : pedidos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><IconInbox size={36} /></div>
            <p style={{ fontWeight: 600 }}>Nenhum pedido enviado ainda</p>
            <small>Pedidos enviados pela tela de Pedidos aparecem aqui.</small>
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Fornecedor</th>
                    <th>Itens</th>
                    <th>WhatsApp</th>
                    <th>E-mail</th>
                    <th>Enviado por</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => (
                    <Fragment key={p.id}>
                      <tr onClick={() => setExpandido(expandido === p.id ? null : p.id)} style={{ cursor: "pointer" }}>
                        <td style={{ color: "var(--text-2)", whiteSpace: "nowrap" }}>{fmtData(p.criadoEm)}</td>
                        <td style={{ fontWeight: 600 }}>{p.fornecedorNome}</td>
                        <td>{p.itens.length} item{p.itens.length !== 1 ? "s" : ""}</td>
                        <td>{badgeStatus(p.whatsapp, "whatsapp")}</td>
                        <td>{badgeStatus(p.email, "email")}</td>
                        <td style={{ color: "var(--text-2)" }}>{p.enviadoPorNome}</td>
                        <td style={{ textAlign: "right" }}>
                          <span style={{ display: "inline-block", transform: expandido === p.id ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                            <IconChevronDown size={16} />
                          </span>
                        </td>
                      </tr>
                      {expandido === p.id && (
                        <tr>
                          <td colSpan={7} style={{ background: "var(--surface-2)", padding: "10px 16px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {p.itens.map((it, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, maxWidth: 420 }}>
                                  <span>{it.nome}</span>
                                  <span style={{ color: "var(--text-2)" }}>{it.quantidade} {it.unidade}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
