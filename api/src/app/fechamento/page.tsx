"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IconCheckCircle, IconAlertTriangle, IconSearch } from "../components/icons";
import { SkeletonTable } from "../components/Skeleton";

type Produto  = { id: string; nome: string; unidade: string; estoqueAtual: number; estoqueMinimo: number };
type Item     = { produto: Produto; contado: string };
type Resultado = { produto: string; estoqueAnterior: number; estoqueContado: number; saida: number; entradaNaoRegistrada: number };

export default function FechamentoPage() {
  const [itens, setItens]           = useState<Item[]>([]);
  const [loading, setLoading]       = useState(true);
  const [salvando, setSalvando]     = useState(false);
  const [resultado, setResultado]   = useState<{ resultados: Resultado[]; alertas: string[] } | null>(null);
  const [busca, setBusca]           = useState("");

  useEffect(() => {
    fetch("/api/produtos")
      .then((r) => r.json())
      .then((data: Produto[]) => { setItens(data.map((p) => ({ produto: p, contado: "" }))); setLoading(false); });
  }, []);

  const atualizar = (id: string, valor: string) =>
    setItens((prev) => prev.map((i) => i.produto.id === id ? { ...i, contado: valor } : i));

  const confirmar = async () => {
    const preenchidos = itens.filter((i) => i.contado !== "");
    if (preenchidos.length === 0) { alert("Informe o estoque de pelo menos um produto."); return; }
    if (!confirm(`Processar fechamento de ${preenchidos.length} produto(s)?`)) return;

    setSalvando(true);
    const res = await fetch("/api/fechamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itens: preenchidos.map((i) => ({ produtoId: i.produto.id, estoqueContado: Number(i.contado) })) }),
    });
    const data = await res.json();
    setSalvando(false);
    if (res.ok) { setResultado(data); setItens((prev) => prev.map((i) => ({ ...i, contado: "" }))); }
  };

  const preenchidos = itens.filter((i) => i.contado !== "").length;
  const itensFiltrados = busca.trim()
    ? itens.filter((i) => i.produto.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    : itens;

  if (loading) return (
    <>
      <div className="page-header"><div className="page-title">Fechamento do Dia</div></div>
      <div className="page-content"><div className="card"><SkeletonTable rows={6} cols={3} /></div></div>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Fechamento do Dia</div>
          <div className="page-subtitle">Digite o que tem agora — o sistema calcula o que foi consumido</div>
        </div>
        <Link href="/" className="btn btn-secondary btn-sm">← Voltar</Link>
      </div>

      <div className="page-content">

        {/* Banner ilustrado */}
        <div style={{ borderRadius: 16, padding: "24px 28px", background: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", overflow: "hidden", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Fechamento do Dia</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Contagem do estoque</div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6, maxWidth: 300 }}>
              Ex: tinha 12 garrafas de cerveja, sobrou 8 → a plataforma entende que 4 unidades foram consumidas e atualiza o estoque automaticamente.
            </div>
          </div>
          <svg width="110" height="90" viewBox="0 0 110 90" fill="none" style={{ flexShrink: 0 }}>
            <rect x="22" y="10" width="60" height="72" rx="8" fill="#C7D2FE"/>
            <rect x="22" y="10" width="60" height="18" rx="8" fill="#A5B4FC"/>
            <rect x="34" y="36" width="36" height="4" rx="2" fill="#818CF8" opacity="0.6"/>
            <rect x="34" y="46" width="28" height="4" rx="2" fill="#818CF8" opacity="0.6"/>
            <rect x="34" y="56" width="32" height="4" rx="2" fill="#818CF8" opacity="0.6"/>
            <circle cx="28" cy="38" r="4" fill="#6366F1" opacity="0.7"/>
            <circle cx="28" cy="48" r="4" fill="#6366F1" opacity="0.7"/>
            <circle cx="28" cy="58" r="4" fill="#6366F1" opacity="0.7"/>
            <path d="M26 38 L27.5 40 L31 35.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M26 48 L27.5 50 L31 45.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="96" cy="22" r="8" fill="#C7D2FE" opacity="0.5"/>
            <circle cx="8"  cy="55" r="6" fill="#C7D2FE" opacity="0.4"/>
          </svg>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="card" style={{ borderTop: "3px solid var(--primary)" }}>
            <div className="card-header">
              <span className="card-title" style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: 8 }}><IconCheckCircle size={17} /> Fechamento processado com sucesso</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setResultado(null)}>Novo fechamento</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Produto</th><th>Era</th><th>Contado</th><th>Saiu</th><th>Extras</th></tr>
                </thead>
                <tbody>
                  {resultado.resultados.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{r.produto}</td>
                      <td style={{ color: "var(--text-2)" }}>{r.estoqueAnterior}</td>
                      <td style={{ fontWeight: 600 }}>{r.estoqueContado}</td>
                      <td className={r.saida > 0 ? "stock-warn" : ""}>
                        {r.saida > 0 ? `↓ ${r.saida}` : "—"}
                      </td>
                      <td className={r.entradaNaoRegistrada > 0 ? "stock-ok" : ""}>
                        {r.entradaNaoRegistrada > 0 ? `↑ ${r.entradaNaoRegistrada}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {resultado.alertas.length > 0 && (
              <div style={{ padding: "0 24px 20px" }}>
                <div className="alert alert-warning">
                  <div className="alert-icon"><IconAlertTriangle size={17} /></div>
                  <div className="alert-content">
                    <strong>Estoque baixo após fechamento</strong>
                    {resultado.alertas.map((a, i) => <span key={i}>{a}</span>)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        {!resultado && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Contagem física do estoque</span>
              <span className="badge badge-gray">{preenchidos} de {itens.length} preenchidos</span>
            </div>

            <div style={{ padding: "4px 0 16px" }}>
              <div className="alert alert-info" style={{ margin: "16px 24px 0" }}>
                <div className="alert-icon">ℹ</div>
                <div className="alert-content">
                  <strong>Como funciona</strong>
                  <span>Digite o que você tem agora em cada produto. Deixe em branco o que não quiser registrar. A diferença para o que estava no sistema é calculada automaticamente.</span>
                </div>
              </div>
            </div>

            <div style={{ padding: "0 24px 16px" }}>
              <div className="input-wrap">
                <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", pointerEvents: "none", display: "flex" }}>
                  <IconSearch size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Buscar produto…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  style={{ paddingLeft: 34 }}
                />
              </div>
            </div>

            {busca.trim() && itensFiltrados.length === 0 && (
              <div style={{ padding: "0 24px 16px", color: "var(--text-3)", fontSize: 13 }}>
                Nenhum produto encontrado com esse nome.
              </div>
            )}

            <div style={{ padding: "0 24px" }}>
              {itensFiltrados.map((item) => {
                const contado    = item.contado !== "" ? Number(item.contado) : null;
                const diferenca  = contado !== null ? contado - item.produto.estoqueAtual : null;

                return (
                  <div className="fech-row" key={item.produto.id}>
                    <div>
                      <div className="fech-nome">{item.produto.nome}</div>
                      <div className="fech-expected">
                        Esperado: {item.produto.estoqueAtual} {item.produto.unidade}
                      </div>
                    </div>
                    <input
                      className="fech-input"
                      type="number"
                      min="0"
                      placeholder="—"
                      value={item.contado}
                      onChange={(e) => atualizar(item.produto.id, e.target.value)}
                    />
                    <div className={`fech-diff ${diferenca === null ? "" : diferenca < 0 ? "neg" : diferenca > 0 ? "pos" : "zero"}`}>
                      {diferenca === null
                        ? ""
                        : diferenca < 0
                        ? `↓ ${Math.abs(diferenca)} saíram`
                        : diferenca > 0
                        ? `↑ ${diferenca} extras`
                        : "✓ igual"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={confirmar}
                disabled={salvando || preenchidos === 0}
              >
                {salvando ? "Processando…" : <><IconCheckCircle size={16} /> Confirmar Fechamento</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
