"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconArrowDownCircle } from "../components/icons";

type Produto = { id: string; nome: string; unidade: string; estoqueAtual: number };

export default function EntradaPage() {
  const [produtos, setProdutos]     = useState<Produto[]>([]);
  const [produtoId, setProdutoId]   = useState("");
  const [busca, setBusca]           = useState("");
  const [listaAberta, setListaAberta] = useState(false);
  const [itemFoco, setItemFoco]     = useState(-1);
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando]     = useState(false);
  const [sucesso, setSucesso]       = useState<{ msg: string; novoEstoque: number; unidade: string } | null>(null);
  const [erro, setErro]             = useState("");
  const inputRef                    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/produtos").then((r) => r.json()).then(setProdutos);
  }, []);

  const produto   = produtos.find((p) => p.id === produtoId);
  const filtrados = busca.trim()
    ? produtos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()))
    : produtos;

  const selecionar = (p: Produto) => {
    setProdutoId(p.id);
    setBusca(p.nome);
    setListaAberta(false);
    setItemFoco(-1);
    setSucesso(null);
    setErro("");
  };

  const limpar = () => {
    setProdutoId("");
    setBusca("");
    setListaAberta(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!listaAberta) { if (e.key === "ArrowDown") setListaAberta(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setItemFoco((f) => Math.min(f + 1, filtrados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setItemFoco((f) => Math.max(f - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (itemFoco >= 0) selecionar(filtrados[itemFoco]); }
    else if (e.key === "Escape") { setListaAberta(false); setItemFoco(-1); }
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso(null);
    if (!produtoId) { setErro("Selecione um produto da lista."); return; }
    if (!quantidade || Number(quantidade) <= 0) { setErro("Informe uma quantidade válida."); return; }

    setSalvando(true);
    const res = await fetch("/api/movimentacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId, tipo: "entrada", quantidade: Number(quantidade), observacao }),
    });
    const data = await res.json();
    setSalvando(false);

    if (res.ok) {
      setSucesso({ msg: `Entrada de ${quantidade} ${produto?.unidade} registrada!`, novoEstoque: data.estoqueAtual, unidade: produto?.unidade ?? "" });
      setProdutos((prev) => prev.map((p) => p.id === produtoId ? { ...p, estoqueAtual: data.estoqueAtual } : p));
      setQuantidade("");
      setObservacao("");
      setProdutoId("");
      setBusca("");
    } else {
      setErro(data.error ?? "Erro ao registrar entrada.");
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Registrar Entrada</div>
          <div className="page-subtitle">Nova compra ou reposição de estoque</div>
        </div>
        <Link href="/" className="btn btn-secondary btn-sm">← Voltar</Link>
      </div>

      <div className="page-content">

        {/* Banner ilustrado */}
        <div style={{ maxWidth: 680, margin: "0 auto 20px", borderRadius: 16, padding: "24px 28px", background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", overflow: "hidden" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Entrada de Estoque</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Reposição manual de produto</div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6, maxWidth: 260 }}>Para compras avulsas ou ajustes rápidos sem nota fiscal. O estoque é atualizado imediatamente.</div>
          </div>
          <svg width="110" height="90" viewBox="0 0 110 90" fill="none" style={{ flexShrink: 0 }}>
            <rect x="15" y="44" width="52" height="36" rx="7" fill="#BBF7D0"/>
            <rect x="15" y="44" width="52" height="14" rx="7" fill="#86EFAC"/>
            <rect x="27" y="53" width="28" height="3" rx="2" fill="#4ADE80" opacity="0.5"/>
            <path d="M41 42 L41 16" stroke="#16A34A" strokeWidth="3.5" strokeLinecap="round"/>
            <path d="M32 32 L41 42 L50 32" stroke="#16A34A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="90" cy="18" r="9" fill="#BBF7D0" opacity="0.5"/>
            <circle cx="100" cy="46" r="5" fill="#BBF7D0" opacity="0.3"/>
            <circle cx="8"  cy="68" r="6" fill="#BBF7D0" opacity="0.4"/>
            <circle cx="88" cy="70" r="4" fill="#86EFAC" opacity="0.4"/>
          </svg>
        </div>

        <div className="card" style={{ maxWidth: 680, margin: "0 auto" }}>
          <div className="card-header">
            <span className="card-title">Dados da entrada</span>
          </div>
          <div className="card-body">
            <form onSubmit={salvar}>

              {sucesso && (
                <div className="alert alert-success" style={{ marginBottom: 20 }}>
                  <div className="alert-icon">✓</div>
                  <div className="alert-content">
                    <strong>{sucesso.msg}</strong>
                    <span>Novo estoque: {sucesso.novoEstoque} {sucesso.unidade}</span>
                  </div>
                </div>
              )}

              {erro && (
                <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                  <div className="alert-icon">✕</div>
                  <div className="alert-content"><strong>{erro}</strong></div>
                </div>
              )}

              {/* Campo de busca com autocomplete */}
              <div className="form-group">
                <label>Produto *</label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "relative" }}>
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Digite o nome do produto…"
                      value={busca}
                      autoComplete="off"
                      onChange={(e) => { setBusca(e.target.value); setProdutoId(""); setListaAberta(true); setItemFoco(-1); }}
                      onFocus={() => setListaAberta(true)}
                      onBlur={() => setTimeout(() => setListaAberta(false), 150)}
                      onKeyDown={onKeyDown}
                      style={{ paddingRight: busca ? 36 : undefined }}
                    />
                    {busca && (
                      <button type="button" onClick={limpar}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 16, lineHeight: 1 }}>
                        ✕
                      </button>
                    )}
                  </div>

                  {listaAberta && filtrados.length > 0 && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: 240, overflowY: "auto" }}>
                      {filtrados.map((p, i) => (
                        <div
                          key={p.id}
                          onMouseDown={() => selecionar(p)}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "1px solid var(--border)",
                            background: i === itemFoco ? "var(--primary-light)" : "transparent",
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "var(--text-1)" }}>{p.nome}</span>
                          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                            {p.estoqueAtual} {p.unidade} em estoque
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {listaAberta && busca.trim() && filtrados.length === 0 && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, padding: "12px 14px", color: "var(--text-3)", fontSize: 13 }}>
                      Nenhum produto encontrado com esse nome.
                    </div>
                  )}
                </div>
              </div>

              {produto && (
                <div className="info-box" style={{ marginBottom: 18 }}>
                  Estoque atual: <strong>{produto.estoqueAtual} {produto.unidade}</strong>
                  {quantidade && Number(quantidade) > 0 && (
                    <> → após entrada: <strong>{produto.estoqueAtual + Number(quantidade)} {produto.unidade}</strong></>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Quantidade *</label>
                <div className="input-wrap">
                  <input type="number" min="1" placeholder="0" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                  {produto && <span className="input-suffix">{produto.unidade}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Observação <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(opcional)</span></label>
                <input type="text" placeholder="Ex: compra avulsa, ajuste de estoque…" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
              </div>

              <div className="divider" />

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={salvando}>
                {salvando ? "Registrando…" : <><IconArrowDownCircle size={16} /> Confirmar Entrada</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
