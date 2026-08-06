"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SkeletonTable } from "../components/Skeleton";
import { IconBox, IconSearch, IconTrash, IconEdit } from "../components/icons";

type Produto = {
  id: string; nome: string; unidade: string;
  estoqueAtual: number; estoqueMinimo: number; estoqueAbaixoMinimo: boolean;
  fornecedor: { id: string; nome: string } | null;
  precoUnitario?: number;
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ProdutosPage() {
  const [produtos, setProdutos]   = useState<Produto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [busca, setBusca]             = useState("");
  const [fornecedorFiltro, setFornecedorFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  const carregar = () =>
    fetch("/api/produtos").then((r) => r.json()).then((d) => { setProdutos(d); setLoading(false); });

  useEffect(() => { carregar(); }, []);

  // Se a API ocultou o campo (role operador), não mostramos valores financeiros.
  const podeVerValores = produtos.length === 0 || produtos.some((p) => p.precoUnitario !== undefined);

  const fornecedoresUnicos = Array.from(
    new Map(produtos.filter((p) => p.fornecedor).map((p) => [p.fornecedor!.id, p.fornecedor!])).values()
  ).sort((a, b) => a.nome.localeCompare(b.nome));

  const filtrados = produtos.filter((p) => {
    if (busca.trim() && !p.nome.toLowerCase().includes(busca.trim().toLowerCase())) return false;
    if (fornecedorFiltro === "sem-fornecedor" && p.fornecedor) return false;
    if (fornecedorFiltro !== "todos" && fornecedorFiltro !== "sem-fornecedor" && p.fornecedor?.id !== fornecedorFiltro) return false;
    if (statusFiltro === "baixo" && !p.estoqueAbaixoMinimo) return false;
    if (statusFiltro === "ok" && p.estoqueAbaixoMinimo) return false;
    return true;
  });

  const valorTotalFiltrado = filtrados.reduce((acc, p) => acc + (p.precoUnitario ?? 0) * p.estoqueAtual, 0);

  const excluir = async (p: Produto) => {
    if (!confirm(`Excluir "${p.nome}"?\nIsso apaga todo o histórico de movimentações.`)) return;
    setExcluindo(p.id);
    await fetch(`/api/produtos/${p.id}`, { method: "DELETE" });
    await carregar();
    setExcluindo(null);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Produtos</div>
          <div className="page-subtitle">
            {filtrados.length === produtos.length ? `${produtos.length} produto(s) cadastrado(s)` : `${filtrados.length} de ${produtos.length} produto(s)`}
          </div>
        </div>
        <div className="header-actions">
          <Link href="/produtos/novo" className="btn btn-primary btn-sm">+ Novo Produto</Link>
        </div>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ paddingBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="form-group" style={{ margin: 0, width: 220 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, display: "block" }}>Buscar produto</label>
                <input type="text" placeholder="Nome do produto..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ width: 220 }} />
              </div>
              <div className="form-group" style={{ margin: 0, width: 200 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, display: "block" }}>Fornecedor</label>
                <select value={fornecedorFiltro} onChange={(e) => setFornecedorFiltro(e.target.value)} style={{ width: 200 }}>
                  <option value="todos">Todos</option>
                  <option value="sem-fornecedor">Sem fornecedor</option>
                  {fornecedoresUnicos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, width: 150 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, display: "block" }}>Status</label>
                <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} style={{ width: 150 }}>
                  <option value="todos">Todos</option>
                  <option value="baixo">⚠ Estoque baixo</option>
                  <option value="ok">✓ Estoque OK</option>
                </select>
              </div>

              {podeVerValores && (
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>Valor total em estoque (filtrado)</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)" }}>{fmt(valorTotalFiltrado)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <SkeletonTable rows={6} cols={6} />
            ) : produtos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><IconBox size={36} /></div>
                <p>Nenhum produto cadastrado</p>
                <small>Clique em "Novo Produto" para começar</small>
              </div>
            ) : filtrados.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><IconSearch size={36} /></div>
                <p>Nenhum produto encontrado com esses filtros</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Fornecedor</th>
                    <th>Unidade</th>
                    <th>Estoque Atual</th>
                    <th>Mín. Alerta</th>
                    {podeVerValores && <th>Valor Unit.</th>}
                    {podeVerValores && <th>Valor em Estoque</th>}
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>
                        <Link href={`/produtos/${p.id}/editar`} style={{ color: "inherit" }}>{p.nome}</Link>
                      </td>
                      <td style={{ color: "var(--text-2)" }}>{p.fornecedor?.nome ?? "—"}</td>
                      <td><span className="badge badge-gray">{p.unidade}</span></td>
                      <td className={p.estoqueAbaixoMinimo ? "stock-warn" : "stock-ok"}>{p.estoqueAtual}</td>
                      <td style={{ color: "var(--text-2)" }}>{p.estoqueMinimo}</td>
                      {podeVerValores && (
                        <td style={{ color: "var(--text-2)" }}>{p.precoUnitario ? fmt(p.precoUnitario) : "—"}</td>
                      )}
                      {podeVerValores && (
                        <td style={{ fontWeight: 700, color: "var(--primary)" }}>
                          {p.precoUnitario ? fmt(p.precoUnitario * p.estoqueAtual) : "—"}
                        </td>
                      )}
                      <td>
                        {p.estoqueAbaixoMinimo
                          ? <span className="badge badge-alerta">⚠ Baixo</span>
                          : <span className="badge badge-ok">✓ OK</span>}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <Link href={`/produtos/${p.id}/editar`} className="btn btn-ghost btn-sm">
                          <IconEdit size={13} /> Editar
                        </Link>{" "}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => excluir(p)}
                          disabled={excluindo === p.id}
                          style={{ color: "var(--danger)" }}
                        >
                          {excluindo === p.id ? "…" : <><IconTrash size={13} /> Excluir</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {podeVerValores && filtrados.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={6} style={{ textAlign: "right", fontWeight: 700, color: "var(--text-2)", background: "var(--surface-2)" }}>
                        Total ({filtrados.length} produto{filtrados.length !== 1 ? "s" : ""}):
                      </td>
                      <td style={{ fontWeight: 800, fontSize: 15, color: "var(--primary)", background: "var(--surface-2)" }}>
                        {fmt(valorTotalFiltrado)}
                      </td>
                      <td colSpan={2} style={{ background: "var(--surface-2)" }}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
