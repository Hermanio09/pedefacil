"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  IconCamera, IconFileText, IconX, IconSearch, IconTruck, IconLightbulb, IconRotateCcw, IconArrowDownCircle,
  IconCheckCircle, IconAlertTriangle, IconChevronDown, IconTrash, IconClock, IconArchive,
} from "../components/icons";

const UNIDADES = ["UN", "CX", "KG", "PCT", "FD", "LT", "GL", "SC", "BAR", "MT"];

const fmt = (v: number) => v > 0 ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

type ItemPreview = { id: string; nome: string; quantidade: number; unidade: string; precoUnitario: number; total: number };
type Fornecedor  = { id: string; nome: string; telefone: string | null; email: string | null };
type Aba = "xml" | "imagem";
type Modo = "unica" | "lote";

function tipoDoArquivo(f: File): "pdf" | "imagem" | "xml" {
  if (f.type === "application/pdf") return "pdf";
  if (f.type.startsWith("image/")) return "imagem";
  if (f.name.toLowerCase().endsWith(".xml") || f.type.includes("xml")) return "xml";
  return "imagem";
}

/** Nomes (normalizados) que aparecem mais de uma vez na lista — sinal de que a IA pode ter
 *  lido dois produtos diferentes (embalagens/preços distintos) com o mesmo nome genérico. */
function nomesDuplicados(itens: ItemPreview[]): Set<string> {
  const contagem = new Map<string, number>();
  for (const it of itens) {
    const chave = it.nome.trim().toLowerCase();
    if (!chave) continue;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return new Set([...contagem].filter(([, n]) => n > 1).map(([nome]) => nome));
}

export default function NotaFiscalPage() {
  const [modo, setModo]                 = useState<Modo>("unica");
  const [aba, setAba]                   = useState<Aba>("imagem");
  const [arquivos, setArquivos]         = useState<File[]>([]);
  const [analisando, setAnalisando]     = useState(false);
  const [confirmando, setConfirmando]   = useState(false);
  const [itens, setItens]               = useState<ItemPreview[]>([]);
  const [erro, setErro]                 = useState("");
  const [sucesso, setSucesso]           = useState("");
  const [valorTotalNota, setValorTotalNota] = useState(0);
  const [dataEmissaoNota, setDataEmissaoNota] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [fornNome, setFornNome]   = useState("");
  const [fornTel, setFornTel]     = useState("");
  const [fornEmail, setFornEmail] = useState("");
  const [fornSugestao, setFornSugestao]       = useState<Fornecedor | null>(null);
  const [fornReconhecidos, setFornReconhecidos] = useState(0);

  // Trava síncrona contra clique duplo — o estado React (`analisando`/`confirmando`) só
  // desabilita o botão depois de re-renderizar, deixando uma janela onde um segundo clique
  // muito rápido ainda passa e duplica a chamada. Refs mudam na hora, sem esperar o render.
  const analisandoLockRef  = useRef(false);
  const confirmandoLockRef = useRef(false);

  const resetar = () => {
    setArquivos([]); setItens([]); setErro(""); setSucesso("");
    setFornNome(""); setFornTel(""); setFornEmail("");
    setFornSugestao(null); setFornReconhecidos(0); setValorTotalNota(0); setDataEmissaoNota(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const adicionarArquivos = (novos: File[]) => {
    if (!novos.length) return;
    setErro(""); setSucesso(""); setItens([]); setFornSugestao(null);
    setArquivos((prev) => {
      const todos = [...prev, ...novos];
      if (todos.length > 10) { setErro("Máximo de 10 imagens por vez."); return prev; }
      return todos;
    });
  };

  const removerArquivo = (idx: number) =>
    setArquivos((prev) => prev.filter((_, i) => i !== idx));

  const detectarFornecedor = async (nomes: string[]) => {
    try {
      const res  = await fetch("/api/nota-fiscal/detectar-fornecedor", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nomes }),
      });
      const data = await res.json();
      if (data.fornecedor) { setFornSugestao(data.fornecedor); setFornReconhecidos(data.reconhecidos); }
    } catch { /* silencioso */ }
  };

  const analisar = async () => {
    if (analisandoLockRef.current) return;
    if (!arquivos.length) { setErro("Selecione pelo menos um arquivo."); return; }
    analisandoLockRef.current = true;
    setAnalisando(true); setErro(""); setSucesso(""); setItens([]); setFornSugestao(null);

    const form = new FormData();
    arquivos.forEach((f) => form.append("arquivo", f));

    const endpoint = aba === "xml" ? "/api/nota-fiscal/xml" : "/api/nota-fiscal/imagem";
    const res  = await fetch(endpoint, { method: "POST", body: form });
    const data = await res.json();
    setAnalisando(false);
    analisandoLockRef.current = false;

    if (!res.ok) { setErro(data.error ?? "Erro ao analisar a nota."); return; }

    // Gemini pode retornar fornecedor + valorTotal diretamente
    if (data.fornecedor && !fornNome) setFornNome(data.fornecedor);
    if (data.valorTotal)              setValorTotalNota(data.valorTotal);
    if (data.dataEmissao)             setDataEmissaoNota(data.dataEmissao);

    const parsed: ItemPreview[] = (data.itens as Omit<ItemPreview, "id">[]).map((item, i) => {
      const precoUnitario = item.precoUnitario ?? 0;
      const quantidade    = item.quantidade    ?? 0;
      return {
        ...item,
        id:       `item-${i}-${Date.now()}`,
        unidade:  UNIDADES.includes(item.unidade) ? item.unidade : "UN",
        quantidade,
        precoUnitario,
        // Sempre recalculado a partir de qtd × preço — não confia no "total" que a IA leu do
        // documento, pois esse valor pode estar errado (erro de impressão da nota ou de OCR).
        total: quantidade * precoUnitario,
      };
    });
    setItens(parsed);

    detectarFornecedor(parsed.map((it) => it.nome));
  };

  const usarSugestao = () => {
    if (!fornSugestao) return;
    setFornNome(fornSugestao.nome);
    setFornTel(fornSugestao.telefone   ?? "");
    setFornEmail(fornSugestao.email    ?? "");
    setFornSugestao(null);
  };

  const atualizarItem = (id: string, campo: keyof ItemPreview, valor: string | number) => {
    setItens((prev) => prev.map((it) => {
      if (it.id !== id) return it;
      const atualizado = { ...it, [campo]: valor };
      if (campo === "quantidade" || campo === "precoUnitario") {
        atualizado.total = Number(atualizado.quantidade) * Number(atualizado.precoUnitario);
      }
      return atualizado;
    }));
  };

  const removerItem   = (id: string) => setItens((prev) => prev.filter((it) => it.id !== id));
  const adicionarLinha = () =>
    setItens((prev) => [...prev, { id: `novo-${Date.now()}`, nome: "", quantidade: 1, unidade: "UN", precoUnitario: 0, total: 0 }]);

  const totalCalculado = itens.reduce((acc, it) => acc + it.total, 0);
  const duplicados     = nomesDuplicados(itens);

  const confirmar = async () => {
    if (confirmandoLockRef.current) return;
    const validos = itens.filter((it) => it.nome.trim() && it.quantidade > 0);
    if (!validos.length) { setErro("Nenhum item válido para confirmar."); return; }

    const duplicados = nomesDuplicados(validos);
    if (duplicados.size > 0) {
      setErro(`Existem itens com o mesmo nome ("${[...duplicados][0]}") nesta nota. Se forem produtos diferentes (embalagens/preços distintos), renomeie um deles antes de confirmar — do contrário eles serão somados como se fossem o mesmo produto.`);
      return;
    }

    confirmandoLockRef.current = true;
    setConfirmando(true); setErro(""); setSucesso("");

    const fornecedor = fornNome.trim()
      ? { nome: fornNome.trim(), telefone: fornTel.trim(), email: fornEmail.trim() }
      : null;

    const tipoReal = aba === "xml"
      ? "xml"
      : arquivos.some((f) => f.type === "application/pdf")
      ? "pdf"
      : "imagem";

    const form = new FormData();
    form.append("itens", JSON.stringify(validos));
    form.append("fornecedor", JSON.stringify(fornecedor));
    form.append("tipo", tipoReal);
    form.append("valorTotal", String(valorTotalNota || totalCalculado));
    if (dataEmissaoNota) form.append("dataEmissao", dataEmissaoNota);
    arquivos.forEach((f) => form.append("arquivo", f));

    const res  = await fetch("/api/nota-fiscal/confirmar", { method: "POST", body: form });
    const data = await res.json();
    setConfirmando(false);
    confirmandoLockRef.current = false;

    if (!res.ok) { setErro(data.error ?? "Erro ao confirmar entradas."); return; }

    const avisos = data.erros?.length ? ` (${data.erros.length} erro(s))` : "";
    setSucesso(`${data.criados} entrada(s) registrada(s) com sucesso!${avisos}`);
    setItens([]); setArquivos([]); setFornNome(""); setFornTel(""); setFornEmail("");
    setValorTotalNota(0); setDataEmissaoNota(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    adicionarArquivos(Array.from(e.dataTransfer.files));
  };

  const aceitaImagem = aba === "imagem"
    ? "image/jpeg,image/png,image/webp,application/pdf"
    : ".xml,application/xml,text/xml";

  const ehMultiImagem = aba === "imagem";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Importar Nota Fiscal</div>
          <div className="page-subtitle">Foto, PDF ou XML — adicione produtos ao estoque automaticamente</div>
        </div>
        <Link href="/" className="btn btn-secondary btn-sm">← Voltar</Link>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: 820, margin: "0 auto 16px", display: "flex", gap: 8 }}>
          <button className={`btn ${modo === "unica" ? "btn-primary" : "btn-secondary"}`} onClick={() => setModo("unica")}>
            <IconFileText size={15} /> Nota única
          </button>
          <button className={`btn ${modo === "lote" ? "btn-primary" : "btn-secondary"}`} onClick={() => setModo("lote")}>
            <IconArchive size={15} /> Várias notas de uma vez
          </button>
        </div>

        {modo === "lote" && <ModoLote />}

        {modo === "unica" && (
        <>
        <div className="card" style={{ maxWidth: 820, margin: "0 auto" }}>
          <div className="card-header">
            <span className="card-title">Tipo de arquivo</span>
          </div>
          <div className="card-body">

            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <button className={`btn ${aba === "imagem" ? "btn-primary" : "btn-secondary"}`} onClick={() => { setAba("imagem"); resetar(); }}>
                <IconCamera size={15} /> Foto / PDF
              </button>
              <button className={`btn ${aba === "xml" ? "btn-primary" : "btn-secondary"}`} onClick={() => { setAba("xml"); resetar(); }}>
                <IconFileText size={15} /> XML NF-e
              </button>
            </div>

            <div className="info-box" style={{ marginBottom: 20 }}>
              {aba === "imagem" ? (
                <>
                  <strong>Foto ou PDF</strong> — Tire uma foto da nota impressa ou envie o PDF.
                  O sistema extrai produtos, quantidades e preços automaticamente. <strong>Gratuito.</strong>
                </>
              ) : (
                <>
                  <strong>XML NF-e</strong> — Upload do arquivo XML eletrônico da nota fiscal. Extração automática e gratuita, 100% precisa.
                </>
              )}
            </div>

            {/* Área de upload */}
            {arquivos.length === 0 ? (
              <div
                style={{
                  border:       "2px dashed var(--border)",
                  borderRadius: 12,
                  padding:      "32px 24px",
                  textAlign:    "center",
                  cursor:       "pointer",
                  background:   "var(--surface)",
                  marginBottom: 20,
                  transition:   "border-color 0.2s",
                }}
                onClick={() => inputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <div style={{ marginBottom: 10, color: "var(--text-3)", display: "flex", justifyContent: "center" }}>
                  {aba === "xml" ? <IconFileText size={38} strokeWidth={1.5} /> : <IconCamera size={38} strokeWidth={1.5} />}
                </div>
                <div style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>
                  Arraste o arquivo ou clique para selecionar
                </div>
                <div style={{ color: "var(--text-3)", fontSize: 13 }}>
                  {aba === "xml" ? "Arquivo .xml da NF-e" : "JPG, PNG, WEBP ou PDF · múltiplas páginas aceitas"}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: "flex", gap: 10, flexWrap: "wrap", padding: "16px",
                  border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface-2)",
                }}>
                  {arquivos.map((arq, idx) => (
                    <div key={idx} style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: 90, height: 90, borderRadius: 8, overflow: "hidden",
                        background: "var(--surface)", border: "1px solid var(--border)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      }}>
                        {arq.type.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={URL.createObjectURL(arq)}
                            alt={`Página ${idx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <>
                            <div style={{ color: "var(--text-3)" }}><IconFileText size={26} /></div>
                            <span style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4, textAlign: "center", padding: "0 4px", wordBreak: "break-all" }}>
                              {arq.name.length > 14 ? arq.name.slice(0, 11) + "…" : arq.name}
                            </span>
                          </>
                        )}
                      </div>
                      <div style={{
                        position: "absolute", top: -6, right: -6,
                        width: 20, height: 20, borderRadius: "50%",
                        background: "var(--danger)", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                      }} onClick={() => removerArquivo(idx)}><IconX size={11} strokeWidth={2.4} /></div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 4 }}>
                        Pág. {idx + 1}
                      </div>
                    </div>
                  ))}

                  {ehMultiImagem && arquivos.length < 10 && (
                    <div
                      onClick={() => inputRef.current?.click()}
                      style={{
                        width: 90, height: 90, borderRadius: 8,
                        border: "2px dashed var(--border)", background: "var(--surface)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "var(--text-3)", fontSize: 13, gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 24 }}>+</span>
                      <span style={{ fontSize: 11, textAlign: "center" }}>mais<br/>página</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-3)" }}>
                  {arquivos.length} página(s) selecionada(s)
                  {ehMultiImagem && " · clique no + para adicionar mais"}
                </div>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept={aceitaImagem}
              multiple={ehMultiImagem}
              style={{ display: "none" }}
              onChange={(e) => {
                const selecionados = Array.from(e.target.files ?? []);
                if (inputRef.current) inputRef.current.value = "";
                adicionarArquivos(selecionados);
              }}
            />

            {erro && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <div className="alert-icon">✕</div>
                <div className="alert-content"><strong>{erro}</strong></div>
              </div>
            )}
            {sucesso && (
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                <div className="alert-icon">✓</div>
                <div className="alert-content"><strong>{sucesso}</strong></div>
              </div>
            )}

            {itens.length === 0 && (
              <button className="btn btn-primary btn-full btn-lg" onClick={analisar} disabled={analisando || !arquivos.length}>
                {analisando
                  ? (aba === "xml" ? "Lendo XML…" : `Analisando ${arquivos.length > 1 ? `${arquivos.length} páginas` : "nota"}…`)
                  : <><IconSearch size={16} /> Analisar Nota Fiscal</>}
              </button>
            )}
          </div>
        </div>

        {itens.length > 0 && (
          <>
            {/* Resumo da nota */}
            {(valorTotalNota > 0 || totalCalculado > 0) && (
              <div className="card" style={{ maxWidth: 820, margin: "16px auto 0" }}>
                <div className="card-body" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  {valorTotalNota > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--text-3)" }}>Total da nota (do documento)</div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: "var(--primary)" }}>{fmt(valorTotalNota)}</div>
                    </div>
                  )}
                  {totalCalculado > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--text-3)" }}>Total calculado (itens)</div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{fmt(totalCalculado)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabela de produtos */}
            <div className="card" style={{ maxWidth: 820, margin: "16px auto 0" }}>
              <div className="card-header">
                <span className="card-title">Produtos encontrados — revise antes de confirmar</span>
                <span style={{ color: "var(--text-3)", fontSize: 13 }}>{itens.length} itens</span>
              </div>
              {duplicados.size > 0 && (
                <div className="alert alert-warning" style={{ margin: "16px 24px 0" }}>
                  <div className="alert-icon"><IconAlertTriangle size={17} /></div>
                  <div className="alert-content">
                    <strong>Itens com nome repetido (destacados abaixo)</strong>
                    <span>Se forem produtos diferentes (embalagens ou preços distintos), renomeie um deles antes de confirmar — do contrário serão somados como se fossem o mesmo produto.</span>
                  </div>
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 200 }}>Produto</th>
                      <th style={{ minWidth: 90 }}>Qtd.</th>
                      <th style={{ minWidth: 100 }}>Unidade</th>
                      <th style={{ minWidth: 120 }}>Preço Unit.</th>
                      <th style={{ minWidth: 110 }}>Total</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => {
                      const duplicado = duplicados.has(item.nome.trim().toLowerCase());
                      return (
                      <tr key={item.id} style={duplicado ? { background: "var(--warning-light)" } : undefined}>
                        <td>
                          <input
                            type="text"
                            value={item.nome}
                            onChange={(e) => atualizarItem(item.id, "nome", e.target.value)}
                            style={{ width: "100%", background: "var(--surface-2)", border: `1px solid ${duplicado ? "var(--warning-border)" : "var(--border)"}`, borderRadius: 6, padding: "6px 10px", color: "var(--text-1)", fontSize: 13 }}
                          />
                          {duplicado && <div style={{ fontSize: 11, color: "var(--on-warning-light)", marginTop: 2 }}>nome repetido nesta nota</div>}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantidade}
                            onChange={(e) => atualizarItem(item.id, "quantidade", Number(e.target.value))}
                            style={{ width: 80, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", color: "var(--text-1)", fontSize: 13 }}
                          />
                        </td>
                        <td>
                          <select
                            value={item.unidade}
                            onChange={(e) => atualizarItem(item.id, "unidade", e.target.value)}
                            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", color: "var(--text-1)", fontSize: 13 }}
                          >
                            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precoUnitario || ""}
                            placeholder="0,00"
                            onChange={(e) => atualizarItem(item.id, "precoUnitario", Number(e.target.value))}
                            style={{ width: 110, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", color: "var(--text-1)", fontSize: 13 }}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: item.total > 0 ? "var(--primary)" : "var(--text-3)", whiteSpace: "nowrap" }}>
                          {fmt(item.total)}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => removerItem(item.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4, display: "flex" }}
                          ><IconX size={14} /></button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="card-body" style={{ paddingTop: 12 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={adicionarLinha}>+ Adicionar linha</button>
              </div>
            </div>

            {/* Fornecedor */}
            <div className="card" style={{ maxWidth: 820, margin: "16px auto 0" }}>
              <div className="card-header">
                <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}><IconTruck size={16} /> Fornecedor desta nota</span>
                <span style={{ color: "var(--text-3)", fontSize: 13 }}>opcional</span>
              </div>
              <div className="card-body">

                {fornSugestao && (
                  <div className="alert alert-warning" style={{ marginBottom: 20 }}>
                    <div className="alert-icon"><IconLightbulb size={17} /></div>
                    <div className="alert-content">
                      <strong>Fornecedor reconhecido: {fornSugestao.nome}</strong>
                      <span>{fornReconhecidos} produto(s) já vinculados a este fornecedor.</span>
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto", flexShrink: 0 }} onClick={usarSugestao}>
                      Usar este
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <label>Nome do fornecedor</label>
                  <input
                    type="text"
                    placeholder="Ex: Distribuidora Bebidas SP"
                    value={fornNome}
                    onChange={(e) => setFornNome(e.target.value)}
                  />
                  {fornNome && <div className="form-hint">Detectado automaticamente — confirme ou edite.</div>}
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>WhatsApp</label>
                    <input type="text" placeholder="Ex: 11 99999-9999" value={fornTel} onChange={(e) => setFornTel(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>E-mail</label>
                    <input type="email" placeholder="Ex: pedidos@fornecedor.com" value={fornEmail} onChange={(e) => setFornEmail(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div style={{ maxWidth: 820, margin: "16px auto 0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={resetar}><IconRotateCcw size={14} /> Recomeçar</button>
              <button className="btn btn-primary btn-lg" onClick={confirmar} disabled={confirmando} style={{ minWidth: 220 }}>
                {confirmando ? "Registrando…" : <><IconArrowDownCircle size={16} /> Confirmar {itens.length} entradas</>}
              </button>
            </div>
          </>
        )}
        </>
        )}
      </div>
    </>
  );
}

// ── Modo Lote: várias notas independentes de uma vez ────────
type StatusLote = "pendente" | "analisando" | "ok" | "erro";
type NotaLote = {
  id: string;
  arquivo: File;
  status: StatusLote;
  erro?: string;
  itens: ItemPreview[];
  fornNome: string;
  fornTel: string;
  fornEmail: string;
  valorTotal: number;
  dataEmissao: string | null;
  expandido: boolean;
  confirmada: boolean;
  fornSugestao: Fornecedor | null;
  fornReconhecidos: number;
};

function ModoLote() {
  const [arquivosLote, setArquivosLote] = useState<File[]>([]);
  const [notas, setNotas]               = useState<NotaLote[]>([]);
  const [analisandoLote, setAnalisandoLote] = useState(false);
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [resumoFinal, setResumoFinal]   = useState("");
  const inputLoteRef = useRef<HTMLInputElement>(null);

  // Travas síncronas contra clique duplo — ver comentário equivalente no modo "Nota única".
  const analisandoLoteLockRef  = useRef(false);
  const confirmandoLoteLockRef = useRef(false);

  const adicionarArquivosLote = (novos: File[]) => {
    if (!novos.length) return;
    setResumoFinal("");
    setArquivosLote((prev) => [...prev, ...novos].slice(0, 20));
  };

  const removerArquivoLote = (idx: number) =>
    setArquivosLote((prev) => prev.filter((_, i) => i !== idx));

  const onDropLote = (e: React.DragEvent) => {
    e.preventDefault();
    adicionarArquivosLote(Array.from(e.dataTransfer.files));
  };

  const analisarTodas = async () => {
    if (analisandoLoteLockRef.current) return;
    if (!arquivosLote.length) return;
    analisandoLoteLockRef.current = true;
    setAnalisandoLote(true);
    setResumoFinal("");

    const iniciais: NotaLote[] = arquivosLote.map((arquivo, i) => ({
      id: `lote-${i}-${Date.now()}`,
      arquivo,
      status: "pendente",
      itens: [],
      fornNome: "", fornTel: "", fornEmail: "",
      valorTotal: 0, dataEmissao: null,
      expandido: false, confirmada: false,
      fornSugestao: null, fornReconhecidos: 0,
    }));
    setNotas((prev) => [...prev, ...iniciais]);
    setArquivosLote([]);

    for (const nota of iniciais) {
      setNotas((prev) => prev.map((n) => n.id === nota.id ? { ...n, status: "analisando" } : n));

      try {
        const tipo     = tipoDoArquivo(nota.arquivo);
        const endpoint = tipo === "xml" ? "/api/nota-fiscal/xml" : "/api/nota-fiscal/imagem";
        const form = new FormData();
        form.append("arquivo", nota.arquivo);
        const res  = await fetch(endpoint, { method: "POST", body: form });
        const data = await res.json();

        if (!res.ok) {
          setNotas((prev) => prev.map((n) => n.id === nota.id ? { ...n, status: "erro", erro: data.error ?? "Erro ao analisar." } : n));
          continue;
        }

        const parsed: ItemPreview[] = (data.itens as Omit<ItemPreview, "id">[]).map((item, i) => {
          const precoUnitario = item.precoUnitario ?? 0;
          const quantidade    = item.quantidade    ?? 0;
          return {
            ...item,
            id:       `item-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            unidade:  UNIDADES.includes(item.unidade) ? item.unidade : "UN",
            quantidade,
            precoUnitario,
            total: quantidade * precoUnitario,
          };
        });

        setNotas((prev) => prev.map((n) => n.id === nota.id ? {
          ...n,
          status:      "ok",
          itens:       parsed,
          fornNome:    data.fornecedor  ?? "",
          valorTotal:  data.valorTotal  ?? 0,
          dataEmissao: data.dataEmissao ?? null,
        } : n));

        detectarFornecedorLote(nota.id, parsed.map((it) => it.nome));
      } catch {
        setNotas((prev) => prev.map((n) => n.id === nota.id ? { ...n, status: "erro", erro: "Erro de conexão." } : n));
      }
    }

    setAnalisandoLote(false);
    analisandoLoteLockRef.current = false;
  };

  const detectarFornecedorLote = async (notaId: string, nomes: string[]) => {
    try {
      const res  = await fetch("/api/nota-fiscal/detectar-fornecedor", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nomes }),
      });
      const data = await res.json();
      if (data.fornecedor) {
        setNotas((prev) => prev.map((n) => n.id === notaId ? { ...n, fornSugestao: data.fornecedor, fornReconhecidos: data.reconhecidos } : n));
      }
    } catch { /* silencioso */ }
  };

  const usarSugestaoLote = (notaId: string) => {
    setNotas((prev) => prev.map((n) => {
      if (n.id !== notaId || !n.fornSugestao) return n;
      return { ...n, fornNome: n.fornSugestao.nome, fornTel: n.fornSugestao.telefone ?? "", fornEmail: n.fornSugestao.email ?? "", fornSugestao: null };
    }));
  };

  const atualizarItemLote = (notaId: string, itemId: string, campo: keyof ItemPreview, valor: string | number) => {
    setNotas((prev) => prev.map((n) => {
      if (n.id !== notaId) return n;
      return {
        ...n,
        itens: n.itens.map((it) => {
          if (it.id !== itemId) return it;
          const atualizado = { ...it, [campo]: valor };
          if (campo === "quantidade" || campo === "precoUnitario") {
            atualizado.total = Number(atualizado.quantidade) * Number(atualizado.precoUnitario);
          }
          return atualizado;
        }),
      };
    }));
  };

  const removerItemLote = (notaId: string, itemId: string) =>
    setNotas((prev) => prev.map((n) => n.id === notaId ? { ...n, itens: n.itens.filter((it) => it.id !== itemId) } : n));

  const atualizarCampoNota = (notaId: string, campo: "fornNome" | "fornTel" | "fornEmail", valor: string) =>
    setNotas((prev) => prev.map((n) => n.id === notaId ? { ...n, [campo]: valor } : n));

  const toggleExpandir = (notaId: string) =>
    setNotas((prev) => prev.map((n) => n.id === notaId ? { ...n, expandido: !n.expandido } : n));

  const removerNota = (notaId: string) =>
    setNotas((prev) => prev.filter((n) => n.id !== notaId));

  const confirmarTodas = async () => {
    if (confirmandoLoteLockRef.current) return;
    const validas = notas.filter((n) => n.status === "ok" && !n.confirmada && n.itens.some((it) => it.nome.trim() && it.quantidade > 0));
    if (!validas.length) return;
    confirmandoLoteLockRef.current = true;
    setConfirmandoLote(true);

    let totalCriados = 0;
    let notasOk       = 0;
    let notasComErro  = 0;

    for (const nota of validas) {
      const itensValidos = nota.itens.filter((it) => it.nome.trim() && it.quantidade > 0);

      const duplicados = nomesDuplicados(itensValidos);
      if (duplicados.size > 0) {
        notasComErro++;
        setNotas((prev) => prev.map((n) => n.id === nota.id ? { ...n, expandido: true } : n));
        continue;
      }

      const fornecedor   = nota.fornNome.trim() ? { nome: nota.fornNome.trim(), telefone: nota.fornTel.trim(), email: nota.fornEmail.trim() } : null;
      const tipo         = tipoDoArquivo(nota.arquivo);
      const totalCalc    = itensValidos.reduce((acc, it) => acc + it.total, 0);

      const form = new FormData();
      form.append("itens", JSON.stringify(itensValidos));
      form.append("fornecedor", JSON.stringify(fornecedor));
      form.append("tipo", tipo);
      form.append("valorTotal", String(nota.valorTotal || totalCalc));
      if (nota.dataEmissao) form.append("dataEmissao", nota.dataEmissao);
      form.append("arquivo", nota.arquivo);

      try {
        const res  = await fetch("/api/nota-fiscal/confirmar", { method: "POST", body: form });
        const data = await res.json();
        if (res.ok) {
          totalCriados += data.criados;
          notasOk++;
          setNotas((prev) => prev.map((n) => n.id === nota.id ? { ...n, confirmada: true, expandido: false } : n));
        } else {
          notasComErro++;
          setNotas((prev) => prev.map((n) => n.id === nota.id ? { ...n, status: "erro", erro: data.error ?? "Erro ao confirmar." } : n));
        }
      } catch {
        notasComErro++;
        setNotas((prev) => prev.map((n) => n.id === nota.id ? { ...n, status: "erro", erro: "Erro de conexão." } : n));
      }
    }

    setConfirmandoLote(false);
    confirmandoLoteLockRef.current = false;
    setResumoFinal(`${totalCriados} entrada(s) registrada(s) em ${notasOk} nota(s)!${notasComErro ? ` ${notasComErro} nota(s) com erro ou pendente de correção — confira abaixo.` : ""}`);
  };

  const notasAnalisadas   = notas.filter((n) => n.status === "ok" || n.status === "erro");
  const notasConfirmaveis = notas.filter((n) => n.status === "ok" && !n.confirmada).length;
  const aindaProcessando  = notas.some((n) => n.status === "pendente" || n.status === "analisando");

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="info-box" style={{ marginBottom: 20 }}>
        <strong>Várias notas de uma vez</strong> — Cada arquivo é tratado como uma nota <strong>independente</strong> (pode misturar foto, PDF e XML à vontade). O sistema analisa uma por uma; depois é só revisar e confirmar todas juntas.
      </div>

      {notas.length === 0 && (
        <div className="card">
          <div className="card-body">
            {arquivosLote.length === 0 ? (
              <div
                style={{ border: "2px dashed var(--border)", borderRadius: 12, padding: "32px 24px", textAlign: "center", cursor: "pointer", background: "var(--surface)", marginBottom: 20 }}
                onClick={() => inputLoteRef.current?.click()}
                onDrop={onDropLote}
                onDragOver={(e) => e.preventDefault()}
              >
                <div style={{ marginBottom: 10, color: "var(--text-3)", display: "flex", justifyContent: "center" }}>
                  <IconArchive size={38} strokeWidth={1.5} />
                </div>
                <div style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>
                  Arraste várias notas ou clique para selecionar
                </div>
                <div style={{ color: "var(--text-3)", fontSize: 13 }}>
                  Foto, PDF ou XML — cada arquivo vira uma nota separada · até 20 por vez
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 16, border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface-2)" }}>
                  {arquivosLote.map((arq, idx) => (
                    <div key={idx} style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 90, height: 90, borderRadius: 8, overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        {arq.type.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={URL.createObjectURL(arq)} alt={arq.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <>
                            <div style={{ color: "var(--text-3)" }}><IconFileText size={26} /></div>
                            <span style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4, textAlign: "center", padding: "0 4px", wordBreak: "break-all" }}>
                              {arq.name.length > 14 ? arq.name.slice(0, 11) + "…" : arq.name}
                            </span>
                          </>
                        )}
                      </div>
                      <div
                        style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--danger)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                        onClick={() => removerArquivoLote(idx)}
                      ><IconX size={11} strokeWidth={2.4} /></div>
                    </div>
                  ))}
                  {arquivosLote.length < 20 && (
                    <div
                      onClick={() => inputLoteRef.current?.click()}
                      style={{ width: 90, height: 90, borderRadius: 8, border: "2px dashed var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-3)", fontSize: 13, gap: 4 }}
                    >
                      <span style={{ fontSize: 24 }}>+</span>
                      <span style={{ fontSize: 11, textAlign: "center" }}>mais<br/>nota</span>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-3)" }}>{arquivosLote.length} nota(s) selecionada(s)</div>
              </div>
            )}

            <input
              ref={inputLoteRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,.xml,application/xml,text/xml"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                const selecionados = Array.from(e.target.files ?? []);
                if (inputLoteRef.current) inputLoteRef.current.value = "";
                adicionarArquivosLote(selecionados);
              }}
            />

            {arquivosLote.length > 0 && (
              <button className="btn btn-primary btn-full btn-lg" onClick={analisarTodas} disabled={analisandoLote}>
                <IconSearch size={16} /> Analisar {arquivosLote.length} nota(s)
              </button>
            )}
          </div>
        </div>
      )}

      {notas.length > 0 && (
        <>
          {resumoFinal && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              <div className="alert-icon"><IconCheckCircle size={17} /></div>
              <div className="alert-content"><strong>{resumoFinal}</strong></div>
            </div>
          )}

          <div style={{ marginBottom: 16, fontSize: 13, color: "var(--text-3)" }}>
            {notasAnalisadas.length} de {notas.length} nota(s) processada(s)
            {aindaProcessando && " · analisando…"}
          </div>

          {notas.map((nota) => {
            const totalCalc = nota.itens.reduce((acc, it) => acc + it.total, 0);
            return (
              <div key={nota.id} className="card" style={{ marginBottom: 12, opacity: nota.confirmada ? 0.6 : 1 }}>
                <div
                  className="card-header"
                  style={{ cursor: nota.status === "ok" ? "pointer" : "default", userSelect: "none" }}
                  onClick={() => nota.status === "ok" && toggleExpandir(nota.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{
                      color: nota.status === "erro" ? "var(--danger)" : nota.status === "ok" ? "var(--primary)" : "var(--text-3)",
                      flexShrink: 0, display: "flex",
                    }}>
                      {nota.status === "erro" ? <IconAlertTriangle size={17} />
                        : nota.status === "ok" ? <IconCheckCircle size={17} />
                        : <IconClock size={17} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {nota.fornNome || nota.arquivo.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                        {nota.status === "pendente" && "Na fila…"}
                        {nota.status === "analisando" && "Analisando…"}
                        {nota.status === "erro" && (nota.erro ?? "Erro ao processar")}
                        {nota.status === "ok" && `${nota.itens.length} item(ns) · ${fmt(nota.valorTotal || totalCalc)}${nota.confirmada ? " · confirmada ✓" : ""}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {nota.fornSugestao && !nota.confirmada && (
                      <span title={`Fornecedor reconhecido: ${nota.fornSugestao.nome}`} style={{ color: "var(--accent)", display: "flex" }}>
                        <IconLightbulb size={16} />
                      </span>
                    )}
                    {!nota.confirmada && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removerNota(nota.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", display: "flex", padding: 4 }}
                        title="Remover esta nota do lote"
                      ><IconTrash size={14} /></button>
                    )}
                    {nota.status === "ok" && (
                      <span style={{ display: "inline-flex", transform: nota.expandido ? "rotate(180deg)" : undefined, transition: "transform 0.15s", color: "var(--text-3)" }}>
                        <IconChevronDown size={16} />
                      </span>
                    )}
                  </div>
                </div>

                {nota.status === "ok" && nota.expandido && (() => {
                  const duplicadosNota = nomesDuplicados(nota.itens);
                  return (
                  <div className="card-body">
                    {duplicadosNota.size > 0 && (
                      <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                        <div className="alert-icon"><IconAlertTriangle size={17} /></div>
                        <div className="alert-content">
                          <strong>Itens com nome repetido (destacados abaixo)</strong>
                          <span>Se forem produtos diferentes, renomeie um deles — do contrário serão somados como o mesmo produto ao confirmar.</span>
                        </div>
                      </div>
                    )}
                    <div className="table-wrap" style={{ marginBottom: 16 }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ minWidth: 180 }}>Produto</th>
                            <th style={{ minWidth: 80 }}>Qtd.</th>
                            <th style={{ minWidth: 90 }}>Unidade</th>
                            <th style={{ minWidth: 100 }}>Preço Unit.</th>
                            <th style={{ minWidth: 100 }}>Total</th>
                            <th style={{ width: 30 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {nota.itens.map((item) => {
                            const dup = duplicadosNota.has(item.nome.trim().toLowerCase());
                            return (
                            <tr key={item.id} style={dup ? { background: "var(--warning-light)" } : undefined}>
                              <td>
                                <input
                                  type="text" value={item.nome} disabled={nota.confirmada}
                                  onChange={(e) => atualizarItemLote(nota.id, item.id, "nome", e.target.value)}
                                  style={{ width: "100%", background: "var(--surface-2)", border: `1px solid ${dup ? "var(--warning-border)" : "var(--border)"}`, borderRadius: 6, padding: "6px 10px", color: "var(--text-1)", fontSize: 13 }}
                                />
                                {dup && <div style={{ fontSize: 11, color: "var(--on-warning-light)", marginTop: 2 }}>nome repetido</div>}
                              </td>
                              <td>
                                <input
                                  type="number" min="0.001" step="0.001" value={item.quantidade} disabled={nota.confirmada}
                                  onChange={(e) => atualizarItemLote(nota.id, item.id, "quantidade", Number(e.target.value))}
                                  style={{ width: 75, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", color: "var(--text-1)", fontSize: 13 }}
                                />
                              </td>
                              <td>
                                <select
                                  value={item.unidade} disabled={nota.confirmada}
                                  onChange={(e) => atualizarItemLote(nota.id, item.id, "unidade", e.target.value)}
                                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", color: "var(--text-1)", fontSize: 13 }}
                                >
                                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number" min="0" step="0.01" value={item.precoUnitario || ""} placeholder="0,00" disabled={nota.confirmada}
                                  onChange={(e) => atualizarItemLote(nota.id, item.id, "precoUnitario", Number(e.target.value))}
                                  style={{ width: 100, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", color: "var(--text-1)", fontSize: 13 }}
                                />
                              </td>
                              <td style={{ fontWeight: 600, color: item.total > 0 ? "var(--primary)" : "var(--text-3)", whiteSpace: "nowrap" }}>
                                {fmt(item.total)}
                              </td>
                              <td>
                                {!nota.confirmada && (
                                  <button
                                    type="button" onClick={() => removerItemLote(nota.id, item.id)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4, display: "flex" }}
                                  ><IconX size={13} /></button>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {nota.fornSugestao && !nota.confirmada && (
                      <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                        <div className="alert-icon"><IconLightbulb size={17} /></div>
                        <div className="alert-content">
                          <strong>Fornecedor reconhecido: {nota.fornSugestao.nome}</strong>
                          <span>{nota.fornReconhecidos} produto(s) já vinculados a este fornecedor.</span>
                        </div>
                        <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto", flexShrink: 0 }} onClick={() => usarSugestaoLote(nota.id)}>
                          Usar este
                        </button>
                      </div>
                    )}

                    <div className="form-row">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Fornecedor</label>
                        <input
                          type="text" value={nota.fornNome} disabled={nota.confirmada}
                          onChange={(e) => atualizarCampoNota(nota.id, "fornNome", e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>WhatsApp <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(opcional)</span></label>
                        <input
                          type="text" value={nota.fornTel} disabled={nota.confirmada}
                          onChange={(e) => atualizarCampoNota(nota.id, "fornTel", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  );
                })()}
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setNotas([]); setResumoFinal(""); }}>
              <IconRotateCcw size={14} /> Recomeçar
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={confirmarTodas}
              disabled={confirmandoLote || aindaProcessando || notasConfirmaveis === 0}
              style={{ minWidth: 220 }}
            >
              {confirmandoLote ? "Confirmando…" : <><IconArrowDownCircle size={16} /> Confirmar {notasConfirmaveis} nota(s)</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
