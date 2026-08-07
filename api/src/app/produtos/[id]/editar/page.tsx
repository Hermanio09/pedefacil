"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const UNIDADES = ["UN", "CX", "L", "KG", "FARDO", "PCT"];
type Fornecedor = { id: string; nome: string };

export default function EditarProdutoPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [nome, setNome]                   = useState("");
  const [unidade, setUnidade]             = useState("UN");
  const [estoqueMinimo, setEstoqueMinimo] = useState("5");
  const [precoUnitario, setPrecoUnitario] = useState("0");
  const [precoVenda, setPrecoVenda]       = useState("0");
  const [fornecedorId, setFornecedorId]   = useState("");
  const [fornecedores, setFornecedores]   = useState<Fornecedor[]>([]);
  const [salvando, setSalvando]           = useState(false);
  const [loading, setLoading]             = useState(true);
  const [erro, setErro]                   = useState("");
  const [podeVerPreco, setPodeVerPreco]   = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/produtos/${id}`).then((r) => r.json()),
      fetch("/api/fornecedores").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/auth/me").then((r) => r.ok ? r.json() : null),
    ]).then(([p, fs, me]) => {
      setNome(p.nome ?? "");
      setUnidade(p.unidade ?? "UN");
      setEstoqueMinimo(String(p.estoqueMinimo ?? 5));
      setPrecoUnitario(String(p.precoUnitario ?? 0));
      setPrecoVenda(String(p.precoVenda ?? 0));
      setFornecedorId(p.fornecedorId ?? "");
      setFornecedores(fs);
      setPodeVerPreco(me?.role !== "operador");
      setLoading(false);
    });
  }, [id]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    setSalvando(true);
    setErro("");
    const res = await fetch(`/api/produtos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome:          nome.trim(),
        unidade,
        estoqueMinimo: Number(estoqueMinimo) || 5,
        ...(podeVerPreco ? { precoUnitario: Number(precoUnitario) || 0, precoVenda: Number(precoVenda) || 0 } : {}),
        fornecedorId:  fornecedorId || null,
      }),
    });
    setSalvando(false);
    if (res.ok) router.push("/produtos");
    else { const d = await res.json(); setErro(d.error ?? "Erro ao salvar."); }
  };

  if (loading) return <div className="page-content"><div className="empty-state"><div className="empty-icon">⏳</div><p>Carregando...</p></div></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Editar Produto</div>
          <div className="page-subtitle">{nome}</div>
        </div>
        <Link href="/produtos" className="btn btn-secondary btn-sm">← Voltar</Link>
      </div>

      <div className="page-content">
        <div className="card" style={{ maxWidth: 680, margin: "0 auto" }}>
          <div className="card-header"><span className="card-title">Informações do produto</span></div>
          <div className="card-body">
            <form onSubmit={salvar}>
              {erro && <div className="alert alert-danger" style={{ marginBottom: 20 }}><div className="alert-icon">✕</div><div className="alert-content"><strong>{erro}</strong></div></div>}

              <div className="form-group">
                <label>Nome do produto *</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
              </div>

              <div className="form-group">
                <label>Unidade de medida</label>
                <div className="chips-row">
                  {UNIDADES.map((u) => (
                    <button key={u} type="button" className={`chip ${unidade === u ? "active" : ""}`} onClick={() => setUnidade(u)}>{u}</button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Mínimo para alerta</label>
                  <div className="input-wrap">
                    <input type="number" min="0" value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} />
                    <span className="input-suffix">{unidade}</span>
                  </div>
                </div>
                {podeVerPreco && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Preço de Compra</label>
                    <div className="input-wrap">
                      <span className="input-suffix" style={{ left: 10, right: "auto" }}>R$</span>
                      <input type="number" min="0" step="0.01" value={precoUnitario} onChange={(e) => setPrecoUnitario(e.target.value)} style={{ paddingLeft: 36 }} />
                    </div>
                    <div className="form-hint">Atualizado automaticamente ao lançar notas fiscais</div>
                  </div>
                )}
              </div>

              {podeVerPreco && (
                <div className="form-group">
                  <label>Preço de Venda</label>
                  <div className="input-wrap">
                    <span className="input-suffix" style={{ left: 10, right: "auto" }}>R$</span>
                    <input type="number" min="0" step="0.01" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} style={{ paddingLeft: 36 }} />
                  </div>
                  <div className="form-hint">Quanto você cobra do cliente final — só muda quando você editar aqui</div>
                </div>
              )}

              <div className="form-group">
                <label>Fornecedor <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(opcional)</span></label>
                <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
                  <option value="">Sem fornecedor</option>
                  {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>

              <div className="divider" />
              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/produtos" className="btn btn-secondary">Cancelar</Link>
                <button type="submit" className="btn btn-primary" disabled={salvando} style={{ flex: 1 }}>
                  {salvando ? "Salvando…" : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
