"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconArrowUpCircle, IconCamera, IconFileText, IconSearch, IconRotateCcw, IconX } from "../components/icons";

type Produto = { id: string; nome: string; unidade: string; estoqueAtual: number; estoqueMinimo: number; estoqueAbaixoMinimo: boolean };
type ItemFoto = { id: string; nomeLido: string; quantidade: number; unidade: string; produtoId: string | null; confianca: number };
type Modo = "manual" | "foto";

const ACEITA_FOTO = "image/jpeg,image/png,image/webp,application/pdf";

export default function SaidaPage() {
  const [modo, setModo]               = useState<Modo>("manual");
  const [produtos, setProdutos]       = useState<Produto[]>([]);
  const [produtoId, setProdutoId]     = useState("");
  const [busca, setBusca]             = useState("");
  const [listaAberta, setListaAberta] = useState(false);
  const [itemFoco, setItemFoco]       = useState(-1);
  const [quantidade, setQuantidade]   = useState("");
  const [observacao, setObservacao]   = useState("");
  const [salvando, setSalvando]       = useState(false);
  const [sucesso, setSucesso]         = useState<{ msg: string; novoEstoque: number; unidade: string; alerta: boolean } | null>(null);
  const [erro, setErro]               = useState("");
  const inputRef                      = useRef<HTMLInputElement>(null);

  const [arquivos, setArquivos]         = useState<File[]>([]);
  const [analisandoFoto, setAnalisandoFoto] = useState(false);
  const [confirmandoFoto, setConfirmandoFoto] = useState(false);
  const [itensFoto, setItensFoto]       = useState<ItemFoto[]>([]);
  const [erroFoto, setErroFoto]         = useState("");
  const [sucessoFoto, setSucessoFoto]   = useState("");
  const fotoInputRef                    = useRef<HTMLInputElement>(null);

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
    if (produto && Number(quantidade) > produto.estoqueAtual) {
      setErro(`Estoque insuficiente. Disponível: ${produto.estoqueAtual} ${produto.unidade}.`);
      return;
    }

    setSalvando(true);
    const res = await fetch("/api/movimentacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId, tipo: "saida", quantidade: Number(quantidade), observacao }),
    });
    const data = await res.json();
    setSalvando(false);

    if (res.ok) {
      setSucesso({ msg: `Saída de ${quantidade} ${produto?.unidade} registrada!`, novoEstoque: data.estoqueAtual, unidade: produto?.unidade ?? "", alerta: data.alerta });
      setProdutos((prev) => prev.map((p) => p.id === produtoId ? { ...p, estoqueAtual: data.estoqueAtual, estoqueAbaixoMinimo: data.alerta } : p));
      setQuantidade("");
      setObservacao("");
      setProdutoId("");
      setBusca("");
    } else {
      setErro(data.error ?? "Erro ao registrar saída.");
    }
  };

  const previewEstoque = produto && quantidade && Number(quantidade) > 0
    ? produto.estoqueAtual - Number(quantidade)
    : null;

  const adicionarArquivos = (novos: File[]) => {
    if (!novos.length) return;
    setErroFoto(""); setSucessoFoto(""); setItensFoto([]);
    setArquivos((prev) => {
      const todos = [...prev, ...novos];
      if (todos.length > 10) { setErroFoto("Máximo de 10 imagens por vez."); return prev; }
      return todos;
    });
  };

  const removerArquivo = (idx: number) => setArquivos((prev) => prev.filter((_, i) => i !== idx));

  const onDropFoto = (e: React.DragEvent) => {
    e.preventDefault();
    adicionarArquivos(Array.from(e.dataTransfer.files));
  };

  const analisarFoto = async () => {
    if (!arquivos.length) { setErroFoto("Selecione ao menos uma foto ou PDF."); return; }
    setAnalisandoFoto(true); setErroFoto(""); setSucessoFoto(""); setItensFoto([]);

    const form = new FormData();
    arquivos.forEach((f) => form.append("arquivo", f));

    const res  = await fetch("/api/saida/imagem", { method: "POST", body: form });
    const data = await res.json();
    setAnalisandoFoto(false);

    if (!res.ok) { setErroFoto(data.error ?? "Erro ao analisar a lista."); return; }

    const parsed: ItemFoto[] = data.itens.map((it: Omit<ItemFoto, "id">, i: number) => ({
      ...it,
      id: `foto-${i}-${Date.now()}`,
    }));
    setItensFoto(parsed);
  };

  const atualizarItemFoto = (id: string, campo: keyof ItemFoto, valor: string | number | null) =>
    setItensFoto((prev) => prev.map((it) => it.id === id ? { ...it, [campo]: valor } : it));

  const removerItemFoto = (id: string) => setItensFoto((prev) => prev.filter((it) => it.id !== id));

  const resetarFoto = () => {
    setArquivos([]); setItensFoto([]); setErroFoto(""); setSucessoFoto("");
    if (fotoInputRef.current) fotoInputRef.current.value = "";
  };

  const confirmarFoto = async () => {
    const validos = itensFoto.filter((it) => it.produtoId && it.quantidade > 0);
    if (!validos.length) { setErroFoto("Associe um produto a cada linha antes de confirmar."); return; }

    setConfirmandoFoto(true); setErroFoto(""); setSucessoFoto("");

    let registrados = 0;
    const erros: string[] = [];

    for (const item of validos) {
      const res = await fetch("/api/movimentacoes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ produtoId: item.produtoId, tipo: "saida", quantidade: item.quantidade, observacao: "Lançado via foto da lista" }),
      });
      if (res.ok) registrados++;
      else {
        const d = await res.json().catch(() => ({}));
        erros.push(`${item.nomeLido}: ${d.error ?? "erro desconhecido"}`);
      }
    }

    setConfirmandoFoto(false);
    setSucessoFoto(`${registrados} saída(s) registrada(s)!${erros.length ? ` ${erros.length} erro(s): ${erros.join("; ")}` : ""}`);
    setItensFoto([]); setArquivos([]);
    fetch("/api/produtos").then((r) => r.json()).then(setProdutos);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Registrar Saída</div>
          <div className="page-subtitle">Baixa de estoque por uso ou venda</div>
        </div>
        <Link href="/" className="btn btn-secondary btn-sm">← Voltar</Link>
      </div>

      <div className="page-content">

        {/* Banner ilustrado */}
        <div style={{ maxWidth: 680, margin: "0 auto 20px", borderRadius: 16, padding: "24px 28px", background: "linear-gradient(135deg, #FFF1F0 0%, #FFE0DC 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", overflow: "hidden" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Saída de Estoque</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Registre o que foi usado</div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6, maxWidth: 260 }}>Cada item usado no serviço deve ser registrado. O estoque é atualizado na hora.</div>
          </div>
          <svg width="110" height="90" viewBox="0 0 110 90" fill="none" style={{ flexShrink: 0 }}>
            <rect x="15" y="48" width="52" height="36" rx="7" fill="#FECACA"/>
            <rect x="15" y="48" width="52" height="14" rx="7" fill="#FCA5A5"/>
            <rect x="27" y="57" width="28" height="3" rx="2" fill="#F87171" opacity="0.5"/>
            <path d="M41 46 L41 16" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round"/>
            <path d="M32 26 L41 16 L50 26" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="90" cy="20" r="9" fill="#FECACA" opacity="0.45"/>
            <circle cx="100" cy="48" r="5" fill="#FECACA" opacity="0.3"/>
            <circle cx="8"  cy="72" r="6" fill="#FECACA" opacity="0.35"/>
          </svg>
        </div>

        <div className="card" style={{ maxWidth: 680, margin: "0 auto" }}>
          <div className="card-header">
            <span className="card-title">Dados da saída</span>
          </div>
          <div className="card-body">

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button type="button" className={`btn ${modo === "manual" ? "btn-primary" : "btn-secondary"}`} onClick={() => setModo("manual")}>
                ⌨ Digitar manualmente
              </button>
              <button type="button" className={`btn ${modo === "foto" ? "btn-primary" : "btn-secondary"}`} onClick={() => setModo("foto")}>
                <IconCamera size={15} /> Foto/PDF da lista
              </button>
            </div>

            {modo === "manual" && (
            <form onSubmit={salvar}>

              {sucesso && (
                <div className={`alert ${sucesso.alerta ? "alert-warning" : "alert-success"}`} style={{ marginBottom: 20 }}>
                  <div className="alert-icon">{sucesso.alerta ? "⚠️" : "✓"}</div>
                  <div className="alert-content">
                    <strong>{sucesso.msg}</strong>
                    <span>Novo estoque: {sucesso.novoEstoque} {sucesso.unidade}{sucesso.alerta && " — abaixo do mínimo!"}</span>
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
                          <span style={{ fontWeight: 600, color: "var(--text-1)" }}>
                            {p.nome}
                            {p.estoqueAbaixoMinimo && <span style={{ marginLeft: 6, color: "#EF4444", fontSize: 12 }}>⚠ baixo</span>}
                          </span>
                          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                            {p.estoqueAtual} {p.unidade} disponível
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {listaAberta && busca.trim() && filtrados.length === 0 && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, padding: "12px 14px", color: "var(--text-3)", fontSize: 13 }}>
                      Nenhum produto encontrado.
                    </div>
                  )}
                </div>
              </div>

              {produto && (
                <div className={`info-box ${produto.estoqueAbaixoMinimo ? "warning" : ""}`} style={{ marginBottom: 18 }}>
                  {produto.estoqueAbaixoMinimo && <strong>⚠ Estoque já abaixo do mínimo — </strong>}
                  Disponível: <strong>{produto.estoqueAtual} {produto.unidade}</strong>
                  {previewEstoque !== null && previewEstoque >= 0 && (
                    <> → após saída: <strong style={{ color: previewEstoque <= produto.estoqueMinimo ? "var(--danger)" : undefined }}>
                      {previewEstoque} {produto.unidade}
                    </strong></>
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
                <input type="text" placeholder="Ex: turno da tarde, mesa 5…" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
              </div>

              <div className="divider" />

              <button type="submit" className="btn btn-danger btn-full btn-lg" disabled={salvando}>
                {salvando ? "Registrando…" : <><IconArrowUpCircle size={16} /> Confirmar Saída</>}
              </button>
            </form>
            )}

            {modo === "foto" && (
              <div>
                {erroFoto && (
                  <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                    <div className="alert-icon">✕</div>
                    <div className="alert-content"><strong>{erroFoto}</strong></div>
                  </div>
                )}
                {sucessoFoto && (
                  <div className="alert alert-success" style={{ marginBottom: 20 }}>
                    <div className="alert-icon">✓</div>
                    <div className="alert-content"><strong>{sucessoFoto}</strong></div>
                  </div>
                )}

                {itensFoto.length === 0 && (
                  <>
                    <div className="info-box" style={{ marginBottom: 20 }}>
                      <strong>Foto ou PDF da lista</strong> — Tire uma foto da lista escrita à mão (ou impressa) com os itens retirados. O sistema lê os nomes e quantidades e casa com os produtos já cadastrados. <strong>Gratuito.</strong>
                    </div>

                    {arquivos.length === 0 ? (
                      <div
                        style={{ border: "2px dashed var(--border)", borderRadius: 12, padding: "32px 24px", textAlign: "center", cursor: "pointer", background: "var(--surface)", marginBottom: 20 }}
                        onClick={() => fotoInputRef.current?.click()}
                        onDrop={onDropFoto}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <div style={{ marginBottom: 10, color: "var(--text-3)", display: "flex", justifyContent: "center" }}><IconCamera size={38} strokeWidth={1.5} /></div>
                        <div style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>Arraste o arquivo ou clique para selecionar</div>
                        <div style={{ color: "var(--text-3)", fontSize: 13 }}>JPG, PNG, WEBP ou PDF · múltiplas páginas aceitas</div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 16, border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface-2)" }}>
                          {arquivos.map((arq, idx) => (
                            <div key={idx} style={{ position: "relative", flexShrink: 0 }}>
                              <div style={{ width: 90, height: 90, borderRadius: 8, overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                {arq.type.startsWith("image/") ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={URL.createObjectURL(arq)} alt={`Página ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <div style={{ color: "var(--text-3)" }}><IconFileText size={26} /></div>
                                )}
                              </div>
                              <div
                                style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--danger)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                                onClick={() => removerArquivo(idx)}
                              ><IconX size={11} strokeWidth={2.4} /></div>
                              <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 4 }}>Pág. {idx + 1}</div>
                            </div>
                          ))}
                          {arquivos.length < 10 && (
                            <div
                              onClick={() => fotoInputRef.current?.click()}
                              style={{ width: 90, height: 90, borderRadius: 8, border: "2px dashed var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-3)", fontSize: 13, gap: 4 }}
                            >
                              <span style={{ fontSize: 24 }}>+</span>
                              <span style={{ fontSize: 11, textAlign: "center" }}>mais<br/>página</span>
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-3)" }}>{arquivos.length} página(s) selecionada(s) · clique no + para adicionar mais</div>
                      </div>
                    )}

                    <input
                      ref={fotoInputRef}
                      type="file"
                      accept={ACEITA_FOTO}
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const selecionados = Array.from(e.target.files ?? []);
                        if (fotoInputRef.current) fotoInputRef.current.value = "";
                        adicionarArquivos(selecionados);
                      }}
                    />

                    <button className="btn btn-primary btn-full btn-lg" onClick={analisarFoto} disabled={analisandoFoto || !arquivos.length}>
                      {analisandoFoto ? `Analisando ${arquivos.length > 1 ? `${arquivos.length} páginas` : "lista"}…` : <><IconSearch size={16} /> Analisar Lista</>}
                    </button>
                  </>
                )}

                {itensFoto.length > 0 && (
                  <>
                    <div className="table-wrap" style={{ marginBottom: 16 }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ minWidth: 160 }}>Lido na lista</th>
                            <th style={{ minWidth: 200 }}>Produto no sistema</th>
                            <th style={{ minWidth: 90 }}>Qtd.</th>
                            <th style={{ width: 40 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {itensFoto.map((item) => (
                            <tr key={item.id}>
                              <td>
                                {item.nomeLido}
                                {!item.produtoId && (
                                  <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>⚠ não encontrado — selecione</div>
                                )}
                                {item.produtoId && item.confianca < 0.8 && (
                                  <div style={{ fontSize: 11, color: "#D97706", marginTop: 2 }}>confira a correspondência</div>
                                )}
                              </td>
                              <td>
                                <select
                                  value={item.produtoId ?? ""}
                                  onChange={(e) => atualizarItemFoto(item.id, "produtoId", e.target.value || null)}
                                  style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", color: "var(--text-1)", fontSize: 13 }}
                                >
                                  <option value="">— selecione um produto —</option>
                                  {produtos.map((p) => (
                                    <option key={p.id} value={p.id}>{p.nome} ({p.estoqueAtual} {p.unidade})</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number" min="0.001" step="0.001" value={item.quantidade}
                                  onChange={(e) => atualizarItemFoto(item.id, "quantidade", Number(e.target.value))}
                                  style={{ width: 80, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", color: "var(--text-1)", fontSize: 13 }}
                                />
                              </td>
                              <td>
                                <button type="button" onClick={() => removerItemFoto(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4, display: "flex" }}><IconX size={14} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button type="button" className="btn btn-secondary" onClick={resetarFoto}><IconRotateCcw size={14} /> Recomeçar</button>
                      <button className="btn btn-danger btn-lg" onClick={confirmarFoto} disabled={confirmandoFoto} style={{ minWidth: 200 }}>
                        {confirmandoFoto ? "Registrando…" : <><IconArrowUpCircle size={16} /> Confirmar {itensFoto.length} saídas</>}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
