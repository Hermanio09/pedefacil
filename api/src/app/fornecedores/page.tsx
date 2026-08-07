"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { IconTruck, IconReceipt, IconSmartphone, IconMail, IconEdit, IconTrash } from "../components/icons";
import { SkeletonTable } from "../components/Skeleton";

type Fornecedor = {
  id: string; nome: string; telefone: string | null; email: string | null;
  _count: { produtos: number };
};

type Produto = {
  id: string; nome: string; unidade: string; estoqueAtual: number; estoqueMinimo: number;
};

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores]   = useState<Fornecedor[]>([]);
  const [loading, setLoading]             = useState(true);
  const [excluindo, setExcluindo]         = useState<string | null>(null);
  const [expandidos, setExpandidos]       = useState<Set<string>>(new Set());
  const [produtos, setProdutos]           = useState<Record<string, Produto[]>>({});
  const [carregandoProd, setCarregandoProd] = useState<Set<string>>(new Set());

  const carregar = () =>
    fetch("/api/fornecedores").then((r) => (r.ok ? r.json() : [])).then((d) => { setFornecedores(d); setLoading(false); });

  useEffect(() => { carregar(); }, []);

  const toggleExpandir = async (id: string) => {
    const novo = new Set(expandidos);
    if (novo.has(id)) {
      novo.delete(id);
      setExpandidos(novo);
      return;
    }

    novo.add(id);
    setExpandidos(novo);

    // só busca se ainda não carregou
    if (!produtos[id]) {
      setCarregandoProd((prev) => new Set(prev).add(id));
      const data = await fetch(`/api/fornecedores/${id}/produtos`).then((r) => r.json());
      setProdutos((prev) => ({ ...prev, [id]: data }));
      setCarregandoProd((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const excluir = async (f: Fornecedor) => {
    if (f._count.produtos > 0) {
      alert(`"${f.nome}" possui ${f._count.produtos} produto(s) vinculado(s). Desvincule-os antes de excluir.`);
      return;
    }
    if (!confirm(`Excluir fornecedor "${f.nome}"?`)) return;
    setExcluindo(f.id);
    await fetch(`/api/fornecedores/${f.id}`, { method: "DELETE" });
    await carregar();
    setExcluindo(null);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Fornecedores</div>
          <div className="page-subtitle">{fornecedores.length} fornecedor(es) cadastrado(s)</div>
        </div>
        <Link href="/nota-fiscal" className="btn btn-secondary btn-sm"><IconReceipt size={14} /> Adicionar via Nota Fiscal</Link>
      </div>

      <div className="page-content">
        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : fornecedores.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><IconTruck size={36} /></div>
                <p>Nenhum fornecedor cadastrado</p>
                <small>Importe uma nota fiscal para cadastrar o primeiro fornecedor</small>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Nome</th>
                    <th>WhatsApp</th>
                    <th>E-mail</th>
                    <th>Produtos</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {fornecedores.map((f) => {
                    const aberto   = expandidos.has(f.id);
                    const loadingP = carregandoProd.has(f.id);
                    const lista    = produtos[f.id] ?? [];

                    return (
                      <Fragment key={f.id}>
                        <tr>
                          {/* seta expansível */}
                          <td>
                            <button
                              onClick={() => toggleExpandir(f.id)}
                              disabled={f._count.produtos === 0}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: f._count.produtos > 0 ? "pointer" : "default",
                                color: f._count.produtos > 0 ? "var(--text-2)" : "var(--text-4, #ccc)",
                                fontSize: 18,
                                padding: "2px 6px",
                                transition: "transform 0.2s",
                                display: "inline-block",
                                transform: aberto ? "rotate(90deg)" : "rotate(0deg)",
                              }}
                              title={aberto ? "Recolher produtos" : "Ver produtos vinculados"}
                            >
                              ›
                            </button>
                          </td>
                          <td style={{ fontWeight: 600 }}>{f.nome}</td>
                          <td>
                            {f.telefone ? (
                              <a href={`https://wa.me/55${f.telefone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                                style={{ color: "var(--primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <IconSmartphone size={13} /> {f.telefone}
                              </a>
                            ) : <span style={{ color: "var(--text-3)" }}>—</span>}
                          </td>
                          <td>
                            {f.email ? (
                              <a href={`mailto:${f.email}`} style={{ color: "var(--primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <IconMail size={13} /> {f.email}
                              </a>
                            ) : <span style={{ color: "var(--text-3)" }}>—</span>}
                          </td>
                          <td>
                            <span className="badge badge-gray">{f._count.produtos} produto(s)</span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              <Link href={`/fornecedores/${f.id}/editar`} className="btn btn-secondary btn-sm"><IconEdit size={13} /> Editar</Link>
                              <button className="btn btn-ghost btn-sm" onClick={() => excluir(f)} disabled={excluindo === f.id} style={{ color: "var(--danger)" }}>
                                {excluindo === f.id ? "…" : <><IconTrash size={13} /> Excluir</>}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* linha expandida com os produtos */}
                        {aberto && (
                          <tr key={`${f.id}-produtos`}>
                            <td></td>
                            <td colSpan={5} style={{ padding: "0 0 12px 0", background: "var(--surface-2)" }}>
                              {loadingP ? (
                                <div style={{ padding: "16px 20px", color: "var(--text-3)", fontSize: 13 }}>⏳ Carregando produtos…</div>
                              ) : lista.length === 0 ? (
                                <div style={{ padding: "16px 20px", color: "var(--text-3)", fontSize: 13 }}>Nenhum produto vinculado.</div>
                              ) : (
                                <table style={{ width: "100%", fontSize: 13 }}>
                                  <thead>
                                    <tr style={{ background: "var(--surface-3, var(--surface-2))" }}>
                                      <th style={{ padding: "8px 20px", fontWeight: 600, color: "var(--text-2)", textAlign: "left" }}>Produto</th>
                                      <th style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text-2)", textAlign: "left" }}>Unidade</th>
                                      <th style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text-2)", textAlign: "left" }}>Estoque atual</th>
                                      <th style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text-2)", textAlign: "left" }}>Mínimo</th>
                                      <th style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text-2)", textAlign: "left" }}>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lista.map((p) => {
                                      const baixo = p.estoqueAtual <= p.estoqueMinimo;
                                      return (
                                        <tr key={p.id}>
                                          <td style={{ padding: "7px 20px", fontWeight: 500 }}>{p.nome}</td>
                                          <td style={{ padding: "7px 12px" }}><span className="badge badge-gray">{p.unidade}</span></td>
                                          <td style={{ padding: "7px 12px" }} className={baixo ? "stock-warn" : "stock-ok"}>{p.estoqueAtual}</td>
                                          <td style={{ padding: "7px 12px", color: "var(--text-2)" }}>{p.estoqueMinimo}</td>
                                          <td style={{ padding: "7px 12px" }}>
                                            {baixo
                                              ? <span className="badge badge-alerta">⚠ Baixo</span>
                                              : <span className="badge badge-ok">✓ OK</span>}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
