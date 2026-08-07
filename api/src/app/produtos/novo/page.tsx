"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const UNIDADES = ["UN", "CX", "L", "KG", "FARDO", "PCT"];

type Fornecedor = { id: string; nome: string };

export default function NovoProdutoPage() {
  const router = useRouter();
  const [nome, setNome]                   = useState("");
  const [unidade, setUnidade]             = useState("UN");
  const [estoqueAtual, setEstoqueAtual]   = useState("0");
  const [estoqueMinimo, setEstoqueMinimo] = useState("5");
  const [precoUnitario, setPrecoUnitario] = useState("");
  const [precoVenda, setPrecoVenda]       = useState("");
  const [fornecedorId, setFornecedorId]   = useState("");
  const [fornecedores, setFornecedores]   = useState<Fornecedor[]>([]);
  const [salvando, setSalvando]           = useState(false);
  const [erro, setErro]                   = useState("");

  useEffect(() => {
    fetch("/api/fornecedores").then((r) => (r.ok ? r.json() : [])).then(setFornecedores);
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { setErro("Informe o nome do produto."); return; }

    setSalvando(true);
    setErro("");
    const res = await fetch("/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nome.trim(),
        unidade,
        estoqueAtual:  Number(estoqueAtual)  || 0,
        estoqueMinimo: Number(estoqueMinimo) || 5,
        precoUnitario: Number(precoUnitario) || 0,
        precoVenda:    Number(precoVenda)    || 0,
        fornecedorId:  fornecedorId || null,
      }),
    });

    if (res.ok) {
      router.push("/produtos");
    } else {
      const data = await res.json();
      setErro(data.error ?? "Erro ao salvar. Tente novamente.");
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Novo Produto</div>
          <div className="page-subtitle">Cadastre um item no estoque</div>
        </div>
        <Link href="/produtos" className="btn btn-secondary btn-sm">← Voltar</Link>
      </div>

      <div className="page-content">
        <div className="card" style={{ maxWidth: 680, margin: "0 auto" }}>
          <div className="card-header">
            <span className="card-title">Informações do produto</span>
          </div>
          <div className="card-body">
            <form onSubmit={salvar}>
              {erro && (
                <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                  <div className="alert-icon">✕</div>
                  <div className="alert-content"><strong>{erro}</strong></div>
                </div>
              )}

              <div className="form-group">
                <label>Nome do produto *</label>
                <input
                  type="text"
                  placeholder="Ex: Coca-Cola 350ml"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Unidade de medida</label>
                <div className="chips-row">
                  {UNIDADES.map((u) => (
                    <button
                      key={u}
                      type="button"
                      className={`chip ${unidade === u ? "active" : ""}`}
                      onClick={() => setUnidade(u)}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Estoque atual</label>
                  <div className="input-wrap">
                    <input
                      type="number" min="0" placeholder="0"
                      value={estoqueAtual}
                      onChange={(e) => setEstoqueAtual(e.target.value)}
                    />
                    <span className="input-suffix">{unidade}</span>
                  </div>
                  <div className="form-hint">Quantidade que você tem agora</div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Mínimo para alerta</label>
                  <div className="input-wrap">
                    <input
                      type="number" min="0" placeholder="5"
                      value={estoqueMinimo}
                      onChange={(e) => setEstoqueMinimo(e.target.value)}
                    />
                    <span className="input-suffix">{unidade}</span>
                  </div>
                  <div className="form-hint">Abaixo disso você recebe alerta</div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Preço de Compra <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(opcional)</span></label>
                  <div className="input-wrap">
                    <input
                      type="number" min="0" step="0.01" placeholder="0,00"
                      value={precoUnitario}
                      onChange={(e) => setPrecoUnitario(e.target.value)}
                    />
                  </div>
                  <div className="form-hint">Quanto você paga ao fornecedor — atualizado automaticamente ao lançar notas fiscais</div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Preço de Venda <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(opcional)</span></label>
                  <div className="input-wrap">
                    <input
                      type="number" min="0" step="0.01" placeholder="0,00"
                      value={precoVenda}
                      onChange={(e) => setPrecoVenda(e.target.value)}
                    />
                  </div>
                  <div className="form-hint">Quanto você cobra do cliente — só muda quando você editar</div>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Fornecedor <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(opcional)</span>
                </label>
                <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
                  <option value="">Sem fornecedor definido</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
                {fornecedores.length === 0 && (
                  <div className="form-hint">
                    <Link href="/fornecedores/novo" style={{ color: "var(--primary)" }}>
                      Cadastrar fornecedor primeiro →
                    </Link>
                  </div>
                )}
              </div>

              <div className="divider" />

              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/produtos" className="btn btn-secondary">Cancelar</Link>
                <button type="submit" className="btn btn-primary" disabled={salvando} style={{ flex: 1 }}>
                  {salvando ? "Salvando…" : "Salvar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
