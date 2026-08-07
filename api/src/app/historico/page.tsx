"use client";
import { useEffect, useState, useCallback } from "react";
import { IconDownload, IconArrowDownCircle, IconArrowUpCircle, IconRefreshCw, IconRotateCcw } from "../components/icons";

type Mov = {
  id: string; tipo: string; quantidade: number; precoUnitario: number;
  observacao: string | null; criadoEm: string;
  revertida: boolean; revertidaEm: string | null; revertidaPorNome: string | null;
  produto: { nome: string; unidade: string };
};

const hoje = new Date().toISOString().slice(0, 10);
const ha30 = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

export default function HistoricoPage() {
  const [movs, setMovs]     = useState<Mov[]>([]);
  const [total, setTotal]   = useState(0);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [de, setDe]         = useState(ha30);
  const [ate, setAte]       = useState(hoje);
  const [tipo, setTipo]     = useState("todos");
  const [revertendo, setRevertendo] = useState<string | null>(null);
  const [erro, setErro]     = useState("");

  const carregar = useCallback(async (p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ de, ate, tipo, page: String(p) });
    const res  = await fetch(`/api/historico?${params}`);
    const data = res.ok ? await res.json() : { movimentacoes: [], total: 0, paginas: 1 };
    setMovs(data.movimentacoes);
    setTotal(data.total);
    setPaginas(data.paginas);
    setPagina(p);
    setLoading(false);
  }, [de, ate, tipo]);

  useEffect(() => { carregar(1); }, [carregar]);

  const reverter = async (mov: Mov) => {
    if (!confirm(`Reverter esta movimentação de ${mov.quantidade} ${mov.produto.unidade} de "${mov.produto.nome}"? O estoque volta ao valor de antes.`)) return;

    setErro("");
    setRevertendo(mov.id);
    const res  = await fetch(`/api/movimentacoes/${mov.id}`, { method: "DELETE" });
    const data = await res.json();
    setRevertendo(null);

    if (!res.ok) { setErro(data.error ?? "Erro ao reverter movimentação."); return; }
    carregar(pagina);
  };

  const exportarCSV = () => {
    const header = "Data,Produto,Tipo,Quantidade,Unidade,Preço Unit.,Total,Observação";
    const rows = movs.map((m) => [
      new Date(m.criadoEm).toLocaleString("pt-BR"),
      `"${m.produto.nome}"`,
      m.tipo,
      m.quantidade,
      m.produto.unidade,
      m.precoUnitario.toFixed(2),
      (m.quantidade * m.precoUnitario).toFixed(2),
      `"${m.observacao ?? ""}"`,
    ].join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `historico-${de}-${ate}.csv`;
    a.click();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Histórico de Movimentações</div>
          <div className="page-subtitle">{total} registro(s) encontrado(s)</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportarCSV} disabled={movs.length === 0}><IconDownload size={14} /> Exportar CSV</button>
      </div>

      <div className="page-content">
        {erro && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <div className="alert-content">{erro}</div>
          </div>
        )}

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
              <div className="form-group" style={{ margin: 0, width: 150 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, display: "block" }}>Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: 150 }}>
                  <option value="todos">Todos</option>
                  <option value="entrada">Entradas</option>
                  <option value="saida">Saídas</option>
                  <option value="ajuste">Ajustes</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ alignSelf: "flex-end" }} onClick={() => carregar(1)}>Buscar</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div className="empty-state"><div className="empty-icon">⏳</div><p>Carregando...</p></div>
            ) : movs.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📋</div><p>Nenhuma movimentação encontrada</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Produto</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Preço Unit.</th>
                    <th>Total</th>
                    <th>Observação</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {movs.map((m) => (
                    <tr key={m.id} style={m.revertida ? { opacity: 0.55 } : undefined}>
                      <td style={{ fontSize: 13, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                        {new Date(m.criadoEm).toLocaleString("pt-BR")}
                      </td>
                      <td style={{ fontWeight: 600 }}>{m.produto.nome}</td>
                      <td>
                        <span className={`badge ${m.tipo === "entrada" ? "badge-ok" : m.tipo === "saida" ? "badge-alerta" : "badge-gray"}`}>
                          {m.tipo === "entrada" ? <><IconArrowDownCircle size={12} /> Entrada</> : m.tipo === "saida" ? <><IconArrowUpCircle size={12} /> Saída</> : <><IconRefreshCw size={12} /> Ajuste</>}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, textDecoration: m.revertida ? "line-through" : "none" }}>
                        {m.quantidade} <span style={{ color: "var(--text-3)", fontSize: 12 }}>{m.produto.unidade}</span>
                      </td>
                      <td style={{ color: "var(--text-2)" }}>
                        {m.precoUnitario > 0 ? `R$ ${m.precoUnitario.toFixed(2)}` : "—"}
                      </td>
                      <td style={{ fontWeight: 600, color: m.tipo === "saida" ? "var(--danger)" : "var(--primary)" }}>
                        {m.precoUnitario > 0 ? `R$ ${(m.quantidade * m.precoUnitario).toFixed(2)}` : "—"}
                      </td>
                      <td style={{ color: "var(--text-3)", fontSize: 13 }}>{m.observacao ?? "—"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {m.revertida ? (
                          <span
                            className="badge badge-gray"
                            title={m.revertidaEm ? `Revertida por ${m.revertidaPorNome ?? "—"} em ${new Date(m.revertidaEm).toLocaleString("pt-BR")}` : undefined}
                          >
                            Revertida
                          </span>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={revertendo === m.id}
                            onClick={() => reverter(m)}
                            title="Desfazer esta movimentação"
                          >
                            <IconRotateCcw size={13} /> {revertendo === m.id ? "Revertendo…" : "Reverter"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {paginas > 1 && (
            <div style={{ padding: "12px 20px", display: "flex", gap: 8, justifyContent: "center", borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-secondary btn-sm" disabled={pagina <= 1} onClick={() => carregar(pagina - 1)}>← Anterior</button>
              <span style={{ lineHeight: "32px", fontSize: 13, color: "var(--text-2)" }}>Página {pagina} de {paginas}</span>
              <button className="btn btn-secondary btn-sm" disabled={pagina >= paginas} onClick={() => carregar(pagina + 1)}>Próxima →</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
