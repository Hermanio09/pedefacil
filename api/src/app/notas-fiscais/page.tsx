"use client";
import { useEffect, useState, useCallback } from "react";
import { IconFileText, IconCamera, IconArchive, IconDownload, IconInbox, IconChevronDown } from "../components/icons";
import { SkeletonTable } from "../components/Skeleton";

type Arquivo = { id: string; nome: string; mimeType: string; ordem: number };
type NotaFiscal = {
  id: string; tipo: string; fornecedorNome: string | null; valorTotal: number;
  dataEmissao: string | null; qtdItens: number; criadoEm: string;
  usuario: { nome: string };
  arquivos: Arquivo[];
};

const fmt = (v: number) => v > 0 ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

const hoje = new Date().toISOString().slice(0, 10);
const ha30 = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

const ICONE_TIPO = { pdf: IconFileText, imagem: IconCamera, xml: IconFileText };
const LABEL_TIPO: Record<string, string> = { pdf: "PDF", imagem: "Foto", xml: "XML" };

export default function NotasFiscaisPage() {
  const [notas, setNotas]     = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [de, setDe]           = useState(ha30);
  const [ate, setAte]         = useState(hoje);
  const [fornecedor, setFornecedor] = useState("");
  const [tipo, setTipo]       = useState("todos");
  const [expandida, setExpandida] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ de, ate, tipo });
    if (fornecedor.trim()) params.set("fornecedor", fornecedor.trim());
    const res = await fetch(`/api/notas-fiscais?${params}`);
    const data = await res.json();
    setNotas(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [de, ate, tipo, fornecedor]);

  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const baixar = (notaId: string, arquivoId: string, nome: string) => {
    const a = document.createElement("a");
    a.href = `/api/notas-fiscais/${notaId}/arquivo/${arquivoId}`;
    a.download = nome;
    a.click();
  };

  const totalGeral = notas.reduce((acc, n) => acc + n.valorTotal, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Notas Fiscais Lançadas</div>
          <div className="page-subtitle">{notas.length} nota(s) encontrada(s) · {fmt(totalGeral)} no total</div>
        </div>
      </div>

      <div className="page-content">
        {/* Filtros */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ paddingBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="form-group" style={{ margin: 0, width: 160 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, display: "block" }}>De</label>
                <input type="date" value={de} onChange={(e) => setDe(e.target.value)} style={{ width: 160 }} />
              </div>
              <div className="form-group" style={{ margin: 0, width: 160 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, display: "block" }}>Até</label>
                <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={{ width: 160 }} />
              </div>
              <div className="form-group" style={{ margin: 0, width: 200 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, display: "block" }}>Fornecedor</label>
                <input type="text" placeholder="Ex: Distribuidora..." value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} style={{ width: 200 }} />
              </div>
              <div className="form-group" style={{ margin: 0, width: 150 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, display: "block" }}>Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: 150 }}>
                  <option value="todos">Todos</option>
                  <option value="pdf">PDF</option>
                  <option value="imagem">Foto</option>
                  <option value="xml">XML</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ alignSelf: "flex-end" }} onClick={carregar}>Buscar</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <SkeletonTable rows={6} cols={7} />
            ) : notas.length === 0 ? (
              <div className="empty-state"><div className="empty-icon"><IconInbox size={36} /></div><p>Nenhuma nota fiscal encontrada nesse período</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Lançada em</th>
                    <th>Tipo</th>
                    <th>Fornecedor</th>
                    <th>Itens</th>
                    <th>Valor Total</th>
                    <th>Lançado por</th>
                    <th>Arquivo</th>
                  </tr>
                </thead>
                <tbody>
                  {notas.map((n) => (
                    <tr key={n.id}>
                      <td style={{ fontSize: 13, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                        {new Date(n.criadoEm).toLocaleString("pt-BR")}
                      </td>
                      <td>
                        <span className="badge badge-gray">
                          {(() => { const Icon = ICONE_TIPO[n.tipo as keyof typeof ICONE_TIPO] ?? IconFileText; return <Icon size={12} />; })()}
                          {LABEL_TIPO[n.tipo] ?? n.tipo}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{n.fornecedorNome ?? "—"}</td>
                      <td>{n.qtdItens}</td>
                      <td style={{ fontWeight: 600, color: "var(--primary)" }}>{fmt(n.valorTotal)}</td>
                      <td style={{ color: "var(--text-2)", fontSize: 13 }}>{n.usuario?.nome ?? "—"}</td>
                      <td>
                        {n.arquivos.length === 0 ? (
                          <span style={{ color: "var(--text-3)", fontSize: 13 }}>—</span>
                        ) : n.arquivos.length === 1 ? (
                          <button className="btn btn-secondary btn-sm" onClick={() => baixar(n.id, n.arquivos[0].id, n.arquivos[0].nome)}>
                            <IconDownload size={13} /> Baixar
                          </button>
                        ) : (
                          <div style={{ position: "relative" }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setExpandida(expandida === n.id ? null : n.id)}>
                              <IconArchive size={13} /> {n.arquivos.length} páginas
                              <span style={{ display: "inline-flex", transform: expandida === n.id ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>
                                <IconChevronDown size={12} />
                              </span>
                            </button>
                            {expandida === n.id && (
                              <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 160 }}>
                                {n.arquivos.sort((a, b) => a.ordem - b.ordem).map((arq, i) => (
                                  <div
                                    key={arq.id}
                                    onClick={() => { baixar(n.id, arq.id, arq.nome); setExpandida(null); }}
                                    style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, borderBottom: i < n.arquivos.length - 1 ? "1px solid var(--border)" : "none" }}
                                  >
                                    Página {i + 1}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
