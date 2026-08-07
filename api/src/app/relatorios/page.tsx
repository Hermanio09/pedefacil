"use client";
import { useEffect, useState, useCallback } from "react";
import {
  IconCalendar, IconBox, IconTruck, IconChartBar, IconClipboardList, IconDownload,
  IconSearch, IconCheckCircle, IconArrowUpCircle, IconRefreshCw, IconArrowDownCircle,
  IconDollarSign, IconAlertTriangle, IconInbox,
} from "../components/icons";
import { SkeletonStatCards, SkeletonTable } from "../components/Skeleton";

// ── Helpers ────────────────────────────────────────────────
const fmt  = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtD = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");

function hoje()    { return new Date().toISOString().slice(0, 10); }
function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ── PDF helper ─────────────────────────────────────────────
async function gerarPDF(
  titulo: string,
  subtitulo: string,
  resumo: { label: string; valor: string; cor: [number, number, number] }[],
  tabelas: { titulo: string; colunas: string[]; linhas: (string | number)[][] }[],
  onShare: boolean
) {
  const { default: jsPDF }    = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W    = doc.internal.pageSize.getWidth();
  const verde = [5, 150, 105] as [number, number, number];
  const cinza = [100, 116, 139] as [number, number, number];
  const escuro = [15, 23, 42] as [number, number, number];

  // Cabeçalho
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, W, 28, "F");
  doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text("StockFacil", 14, 13);
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  doc.text(titulo, 14, 21);
  doc.setFontSize(11);
  doc.text(subtitulo, W - 14, 13, { align: "right" });
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, W - 14, 21, { align: "right" });

  let y = 36;

  // Cards de resumo
  if (resumo.length > 0) {
    const cw = (W - 28 - (resumo.length - 1) * 4) / resumo.length;
    resumo.forEach((c, i) => {
      const x = 14 + i * (cw + 4);
      doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cw, 22, 3, 3, "FD");
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...cinza);
      doc.text(c.label, x + cw / 2, y + 7, { align: "center", maxWidth: cw - 4 });
      doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...c.cor);
      doc.text(c.valor, x + cw / 2, y + 16, { align: "center" });
    });
    y += 30;
  }

  // Tabelas
  for (const tab of tabelas) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...escuro);
    doc.text(tab.titulo, 14, y);
    y += 4;
    autoTable(doc, {
      startY:     y,
      head:       [tab.colunas],
      body:       tab.linhas,
      styles:     { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: verde, fontStyle: "bold" },
      margin:     { left: 14, right: 14 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Rodapé
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(...cinza);
    doc.text(`StockFacil · Relatório gerado automaticamente · Página ${i}/${pages}`, W / 2, 290, { align: "center" });
  }

  const blob     = doc.output("blob");
  const fileName = `relatorio-stockfacil-${titulo.toLowerCase().replace(/\s+/g, "-")}.pdf`;
  const file     = new File([blob], fileName, { type: "application/pdf" });

  const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (onShare && isMobileDevice && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: `StockFacil — ${titulo}`, files: [file] });
  } else {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }
}

// ── Tipos ──────────────────────────────────────────────────
type Tab = "periodo" | "estoque" | "fornecedores" | "consumo" | "fechamentos";

const TABS = [
  { key: "periodo" as Tab,      label: "Por Período",    icon: IconCalendar },
  { key: "estoque" as Tab,      label: "Estoque Atual",  icon: IconBox },
  { key: "fornecedores" as Tab, label: "Fornecedores",   icon: IconTruck },
  { key: "consumo" as Tab,      label: "Consumo",        icon: IconChartBar },
  { key: "fechamentos" as Tab,  label: "Fechamentos",    icon: IconClipboardList },
];

// ── Componente principal ───────────────────────────────────
export default function RelatoriosPage() {
  const [tab,      setTab]      = useState<Tab>("periodo");
  const [isMobile, setIsMobile] = useState(false);
  const [gerando,  setGerando]  = useState(false);

  useEffect(() => {
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) setIsMobile(true);
  }, []);

  const pdfBtn = (onClick: () => void, disabled: boolean) => (
    <button className="btn btn-primary btn-sm" onClick={onClick} disabled={disabled || gerando}>
      {gerando ? "Gerando…" : isMobile ? <><IconArrowUpCircle size={14} /> Compartilhar PDF</> : <><IconDownload size={14} /> Baixar PDF</>}
    </button>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Relatórios</div>
          <div className="page-subtitle">Análise completa do seu negócio</div>
        </div>
      </div>

      <div className="page-content">
        {/* Abas */}
        <div className="rel-tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                className={`rel-tab ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo das abas */}
        {tab === "periodo"      && <TabPeriodo      isMobile={isMobile} gerando={gerando} setGerando={setGerando} pdfBtn={pdfBtn} />}
        {tab === "estoque"      && <TabEstoque      isMobile={isMobile} gerando={gerando} setGerando={setGerando} pdfBtn={pdfBtn} />}
        {tab === "fornecedores" && <TabFornecedores isMobile={isMobile} gerando={gerando} setGerando={setGerando} pdfBtn={pdfBtn} />}
        {tab === "consumo"      && <TabConsumo      isMobile={isMobile} gerando={gerando} setGerando={setGerando} pdfBtn={pdfBtn} />}
        {tab === "fechamentos"  && <TabFechamentos  isMobile={isMobile} gerando={gerando} setGerando={setGerando} pdfBtn={pdfBtn} />}
      </div>
    </>
  );
}

// ── Filtro de período reutilizável ─────────────────────────
function FiltroPeriodo({ de, ate, setDe, setAte, onBuscar, loading }: {
  de: string; ate: string; setDe: (v: string) => void; setAte: (v: string) => void;
  onBuscar: () => void; loading: boolean;
}) {
  return (
    <div className="rel-filtro">
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>De</label>
        <input type="date" value={de} onChange={(e) => setDe(e.target.value)} style={{ width: 160 }} />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>Até</label>
        <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={{ width: 160 }} />
      </div>
      <button className="btn btn-primary btn-sm" onClick={onBuscar} disabled={loading} style={{ alignSelf: "flex-end" }}>
        {loading ? "Buscando…" : <><IconSearch size={14} /> Buscar</>}
      </button>
    </div>
  );
}

// ── Aba: Por Período ───────────────────────────────────────
type PeriodoData = {
  de: string; ate: string;
  totalEntradas: number; totalSaidas: number; totalAjustes: number;
  qtdEntradas: number; qtdSaidas: number; custoEntradas: number;
  movimentacoes: { id: string; data: string; tipo: string; produto: string; unidade: string; quantidade: number; preco: number; total: number; observacao: string | null }[];
};

function TabPeriodo({ gerando, setGerando, pdfBtn }: { isMobile: boolean; gerando: boolean; setGerando: (v: boolean) => void; pdfBtn: (fn: () => void, d: boolean) => React.ReactNode }) {
  const [de,      setDe]      = useState(inicioMes());
  const [ate,     setAte]     = useState(hoje());
  const [data,    setData]    = useState<PeriodoData | null>(null);
  const [loading, setLoading] = useState(false);

  const buscar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/relatorios/periodo?de=${de}&ate=${ate}`).then((res) => res.json());
    setData(r); setLoading(false);
  }, [de, ate]);

  useEffect(() => { buscar(); }, []);

  const tipoIcone = (t: string) => t === "entrada" ? IconCheckCircle : t === "saida" ? IconArrowUpCircle : IconRefreshCw;
  const tipoNome  = (t: string) => t === "entrada" ? "Entrada" : t === "saida" ? "Saída" : "Ajuste";
  const tipoCor   = (t: string) => t === "entrada" ? "var(--primary)" : t === "saida" ? "var(--danger)" : "var(--warning)";

  const handlePDF = async () => {
    if (!data) return;
    setGerando(true);
    try {
      await gerarPDF(
        "Relatório por Período",
        `${fmtD(data.de)} a ${fmtD(data.ate)}`,
        [
          { label: "Entradas",       valor: `${data.totalEntradas} (${data.qtdEntradas} un.)`, cor: [5, 150, 105] },
          { label: "Saídas",         valor: `${data.totalSaidas} (${data.qtdSaidas} un.)`,     cor: [239, 68, 68] },
          { label: "Custo de Compras", valor: fmt(data.custoEntradas),                          cor: [245, 158, 11] },
        ],
        [{
          titulo:   "Movimentações",
          colunas:  ["Data", "Tipo", "Produto", "Qtd.", "Custo Unit.", "Total"],
          linhas:   data.movimentacoes.map((m) => [
            new Date(m.data).toLocaleDateString("pt-BR"),
            m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1),
            m.produto,
            `${m.quantidade} ${m.unidade}`,
            m.preco > 0 ? fmt(m.preco) : "—",
            m.total > 0 ? fmt(m.total) : "—",
          ]),
        }],
        true
      );
    } finally { setGerando(false); }
  };

  return (
    <div>
      <FiltroPeriodo de={de} ate={ate} setDe={setDe} setAte={setAte} onBuscar={buscar} loading={loading} />

      {loading && <SkeletonStatCards />}

      {!loading && data && (
        <>
          <div className="rel-resumo-grid">
            <div className="stat-card">
              <div className="stat-icon green"><IconArrowDownCircle size={20} /></div>
              <div><div className="stat-value" style={{ color: "var(--primary)" }}>{data.totalEntradas}</div>
                <div className="stat-label">Entradas</div>
                <div className="stat-sub">{data.qtdEntradas} unidades</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red"><IconArrowUpCircle size={20} /></div>
              <div><div className="stat-value" style={{ color: "var(--danger)" }}>{data.totalSaidas}</div>
                <div className="stat-label">Saídas</div>
                <div className="stat-sub">{data.qtdSaidas} unidades</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow"><IconDollarSign size={20} /></div>
              <div><div className="stat-value" style={{ color: "var(--warning)", fontSize: 20 }}>{fmt(data.custoEntradas)}</div>
                <div className="stat-label">Custo de Compras</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><IconRefreshCw size={20} /></div>
              <div><div className="stat-value">{data.totalAjustes}</div>
                <div className="stat-label">Ajustes (Fechamentos)</div></div>
            </div>
          </div>

          <div className="rel-card-header">
            <span className="card-title">Movimentações ({data.movimentacoes.length})</span>
            {pdfBtn(handlePDF, !data)}
          </div>
          <div className="card">
            <div className="table-wrap">
              {data.movimentacoes.length === 0
                ? <div className="empty-state"><div className="empty-icon"><IconInbox size={36} /></div><p>Sem movimentações no período</p></div>
                : <table>
                    <thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Qtd.</th><th>Total</th></tr></thead>
                    <tbody>
                      {data.movimentacoes.map((m) => (
                        <tr key={m.id}>
                          <td style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>{new Date(m.data).toLocaleDateString("pt-BR")}</td>
                          <td><span style={{ color: tipoCor(m.tipo), fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>{(() => { const Icon = tipoIcone(m.tipo); return <Icon size={12} />; })()} {tipoNome(m.tipo)}</span></td>
                          <td style={{ fontWeight: 500 }}>{m.produto}</td>
                          <td>{m.quantidade} <span style={{ color: "var(--text-3)", fontSize: 12 }}>{m.unidade}</span></td>
                          <td style={{ fontWeight: 700, color: m.total > 0 ? "var(--text)" : "var(--text-3)" }}>{m.total > 0 ? fmt(m.total) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Aba: Estoque Atual ─────────────────────────────────────
type EstoqueData = {
  geradoEm: string; totalValor: number; totalItens: number; totalUnidades: number; emAlerta: number;
  itens: { id: string; nome: string; unidade: string; estoqueAtual: number; estoqueMinimo: number; precoUnitario: number; valorTotal: number; fornecedor: string; status: string }[];
};

function TabEstoque({ gerando, setGerando, pdfBtn }: { isMobile: boolean; gerando: boolean; setGerando: (v: boolean) => void; pdfBtn: (fn: () => void, d: boolean) => React.ReactNode }) {
  const [data,    setData]    = useState<EstoqueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/relatorios/estoque").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  const statusBadge = (s: string) =>
    s === "zerado" ? <span className="badge badge-danger">Zerado</span>
    : s === "baixo" ? <span className="badge badge-alerta">Baixo</span>
    : <span className="badge badge-ok">OK</span>;

  const handlePDF = async () => {
    if (!data) return;
    setGerando(true);
    try {
      await gerarPDF(
        "Estoque Atual",
        `Gerado em ${new Date(data.geradoEm).toLocaleDateString("pt-BR")}`,
        [
          { label: "Total em Estoque",  valor: fmt(data.totalValor),     cor: [5, 150, 105] },
          { label: "Produtos Cadastrados", valor: String(data.totalItens), cor: [59, 130, 246] },
          { label: "Em Alerta",         valor: String(data.emAlerta),    cor: [239, 68, 68] },
        ],
        [{
          titulo:  "Estoque Detalhado",
          colunas: ["Produto", "Fornecedor", "Qtd.", "Un.", "Mín.", "Preço Unit.", "Valor Total", "Status"],
          linhas:  data.itens.map((p) => [
            p.nome, p.fornecedor, p.estoqueAtual, p.unidade, p.estoqueMinimo,
            p.precoUnitario > 0 ? fmt(p.precoUnitario) : "—",
            p.valorTotal > 0    ? fmt(p.valorTotal)    : "—",
            p.status === "zerado" ? "ZERADO" : p.status === "baixo" ? "BAIXO" : "OK",
          ]),
        }],
        true
      );
    } finally { setGerando(false); }
  };

  if (loading) return <SkeletonStatCards />;
  if (!data)   return null;

  return (
    <div>
      <div className="rel-resumo-grid">
        <div className="stat-card">
          <div className="stat-icon green"><IconDollarSign size={20} /></div>
          <div><div className="stat-value" style={{ color: "var(--primary)", fontSize: 20 }}>{fmt(data.totalValor)}</div>
            <div className="stat-label">Valor Total em Estoque</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><IconBox size={20} /></div>
          <div><div className="stat-value">{data.totalItens}</div>
            <div className="stat-label">Produtos Cadastrados</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><IconChartBar size={20} /></div>
          <div><div className="stat-value">{data.totalUnidades}</div>
            <div className="stat-label">Total de Unidades</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><IconAlertTriangle size={20} /></div>
          <div><div className="stat-value" style={{ color: data.emAlerta > 0 ? "var(--danger)" : undefined }}>{data.emAlerta}</div>
            <div className="stat-label">Em Alerta</div></div>
        </div>
      </div>

      <div className="rel-card-header">
        <span className="card-title">Estoque Detalhado ({data.totalItens} produtos)</span>
        {pdfBtn(handlePDF, !data)}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Produto</th><th>Fornecedor</th><th>Qtd.</th><th>Mín.</th><th>Preço Unit.</th><th>Valor Total</th><th>Status</th></tr></thead>
            <tbody>
              {data.itens.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.nome}</td>
                  <td style={{ color: "var(--text-3)", fontSize: 12 }}>{p.fornecedor}</td>
                  <td style={{ fontWeight: 700, color: p.estoqueAtual === 0 ? "var(--danger)" : p.estoqueAtual < p.estoqueMinimo ? "var(--warning)" : "var(--primary)" }}>
                    {p.estoqueAtual} <span style={{ color: "var(--text-3)", fontSize: 11 }}>{p.unidade}</span>
                  </td>
                  <td style={{ color: "var(--text-3)" }}>{p.estoqueMinimo}</td>
                  <td>{p.precoUnitario > 0 ? fmt(p.precoUnitario) : <span style={{ color: "var(--text-3)" }}>—</span>}</td>
                  <td style={{ fontWeight: 700, color: "var(--primary)" }}>{p.valorTotal > 0 ? fmt(p.valorTotal) : <span style={{ color: "var(--text-3)" }}>—</span>}</td>
                  <td>{statusBadge(p.status)}</td>
                </tr>
              ))}
              <tr style={{ background: "var(--surface-2)", borderTop: "2px solid var(--border)" }}>
                <td colSpan={5} style={{ fontWeight: 700, textAlign: "right" }}>Total do Estoque:</td>
                <td style={{ fontWeight: 700, fontSize: 15, color: "var(--primary)" }}>{fmt(data.totalValor)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Aba: Fornecedores ──────────────────────────────────────
type FornData = {
  de: string; ate: string; totalGeral: number;
  fornecedores: { nome: string; totalGasto: number; totalItens: number; entradas: { data: string; produto: string; unidade: string; quantidade: number; custo: number }[] }[];
};

function TabFornecedores({ gerando, setGerando, pdfBtn }: { isMobile: boolean; gerando: boolean; setGerando: (v: boolean) => void; pdfBtn: (fn: () => void, d: boolean) => React.ReactNode }) {
  const [de,      setDe]      = useState(inicioMes());
  const [ate,     setAte]     = useState(hoje());
  const [data,    setData]    = useState<FornData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/relatorios/fornecedores?de=${de}&ate=${ate}`).then((res) => res.json());
    setData(r); setLoading(false);
  }, [de, ate]);

  useEffect(() => { buscar(); }, []);

  const handlePDF = async () => {
    if (!data) return;
    setGerando(true);
    try {
      const linhas: (string | number)[][] = [];
      data.fornecedores.forEach((f) => {
        linhas.push([f.nome, `${f.totalItens} un.`, fmt(f.totalGasto), ""]);
        f.entradas.forEach((e) => {
          linhas.push(["  └ " + new Date(e.data).toLocaleDateString("pt-BR"), e.produto, `${e.quantidade} ${e.unidade}`, fmt(e.custo)]);
        });
      });
      await gerarPDF(
        "Compras por Fornecedor",
        `${fmtD(data.de)} a ${fmtD(data.ate)}`,
        [{ label: "Total de Compras", valor: fmt(data.totalGeral), cor: [5, 150, 105] },
         { label: "Fornecedores",     valor: String(data.fornecedores.length), cor: [59, 130, 246] }],
        [{ titulo: "Detalhamento por Fornecedor", colunas: ["Fornecedor / Data", "Produto", "Qtd.", "Custo"], linhas }],
        true
      );
    } finally { setGerando(false); }
  };

  return (
    <div>
      <FiltroPeriodo de={de} ate={ate} setDe={setDe} setAte={setAte} onBuscar={buscar} loading={loading} />
      {loading && <SkeletonStatCards count={2} />}
      {!loading && data && (
        <>
          <div className="rel-resumo-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="stat-card">
              <div className="stat-icon green"><IconDollarSign size={20} /></div>
              <div><div className="stat-value" style={{ color: "var(--primary)", fontSize: 20 }}>{fmt(data.totalGeral)}</div>
                <div className="stat-label">Total Gasto no Período</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><IconTruck size={20} /></div>
              <div><div className="stat-value">{data.fornecedores.length}</div>
                <div className="stat-label">Fornecedores Ativos</div></div>
            </div>
          </div>

          <div className="rel-card-header">
            <span className="card-title">Compras por Fornecedor</span>
            {pdfBtn(handlePDF, !data)}
          </div>

          {data.fornecedores.length === 0
            ? <div className="card"><div className="empty-state"><div className="empty-icon"><IconInbox size={36} /></div><p>Sem compras no período</p></div></div>
            : data.fornecedores.map((f) => (
              <div key={f.nome} className="card" style={{ marginBottom: 12 }}>
                <div
                  className="card-header"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => setExpandido(expandido === f.nome ? null : f.nome)}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{f.nome}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{f.totalItens} unidades compradas</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: 16 }}>{fmt(f.totalGasto)}</span>
                    <span style={{ color: "var(--text-3)" }}>{expandido === f.nome ? "▲" : "▼"}</span>
                  </div>
                </div>
                {expandido === f.nome && (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Data</th><th>Produto</th><th>Qtd.</th><th>Custo</th></tr></thead>
                      <tbody>
                        {f.entradas.map((e, i) => (
                          <tr key={i}>
                            <td style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>{new Date(e.data).toLocaleDateString("pt-BR")}</td>
                            <td style={{ fontWeight: 500 }}>{e.produto}</td>
                            <td>{e.quantidade} <span style={{ color: "var(--text-3)", fontSize: 12 }}>{e.unidade}</span></td>
                            <td style={{ fontWeight: 700 }}>{e.custo > 0 ? fmt(e.custo) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          }
        </>
      )}
    </div>
  );
}

// ── Aba: Consumo ───────────────────────────────────────────
type ConsumoData = {
  de: string; ate: string; totalQtd: number; totalCusto: number;
  produtos: { nome: string; unidade: string; quantidade: number; custo: number }[];
};

function TabConsumo({ gerando, setGerando, pdfBtn }: { isMobile: boolean; gerando: boolean; setGerando: (v: boolean) => void; pdfBtn: (fn: () => void, d: boolean) => React.ReactNode }) {
  const [de,      setDe]      = useState(inicioMes());
  const [ate,     setAte]     = useState(hoje());
  const [data,    setData]    = useState<ConsumoData | null>(null);
  const [loading, setLoading] = useState(false);

  const buscar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/relatorios/consumo?de=${de}&ate=${ate}`).then((res) => res.json());
    setData(r); setLoading(false);
  }, [de, ate]);

  useEffect(() => { buscar(); }, []);

  const handlePDF = async () => {
    if (!data) return;
    setGerando(true);
    try {
      await gerarPDF(
        "Relatório de Consumo",
        `${fmtD(data.de)} a ${fmtD(data.ate)}`,
        [{ label: "Total Consumido", valor: `${data.totalQtd} un.`, cor: [239, 68, 68] },
         { label: "Custo do Consumo", valor: fmt(data.totalCusto), cor: [245, 158, 11] }],
        [{
          titulo:  "Consumo por Produto",
          colunas: ["#", "Produto", "Consumido", "Custo Total", "% do Total"],
          linhas:  data.produtos.map((p, i) => [
            i + 1, p.nome, `${p.quantidade} ${p.unidade}`,
            p.custo > 0 ? fmt(p.custo) : "—",
            data.totalQtd > 0 ? `${((p.quantidade / data.totalQtd) * 100).toFixed(1)}%` : "—",
          ]),
        }],
        true
      );
    } finally { setGerando(false); }
  };

  return (
    <div>
      <FiltroPeriodo de={de} ate={ate} setDe={setDe} setAte={setAte} onBuscar={buscar} loading={loading} />
      {loading && <SkeletonStatCards count={2} />}
      {!loading && data && (
        <>
          <div className="rel-resumo-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="stat-card">
              <div className="stat-icon red"><IconArrowUpCircle size={20} /></div>
              <div><div className="stat-value" style={{ color: "var(--danger)" }}>{data.totalQtd}</div>
                <div className="stat-label">Total Consumido (un.)</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow"><IconDollarSign size={20} /></div>
              <div><div className="stat-value" style={{ color: "var(--warning)", fontSize: 20 }}>{fmt(data.totalCusto)}</div>
                <div className="stat-label">Custo do Consumo</div></div>
            </div>
          </div>

          <div className="rel-card-header">
            <span className="card-title">Ranking de Consumo ({data.produtos.length} produtos)</span>
            {pdfBtn(handlePDF, !data)}
          </div>
          <div className="card">
            <div className="table-wrap">
              {data.produtos.length === 0
                ? <div className="empty-state"><div className="empty-icon"><IconChartBar size={36} /></div><p>Sem consumo no período</p></div>
                : <table>
                    <thead><tr><th>#</th><th>Produto</th><th>Consumido</th><th>Custo Total</th><th>% do Total</th></tr></thead>
                    <tbody>
                      {data.produtos.map((p, i) => (
                        <tr key={i}>
                          <td style={{ color: "var(--text-3)", width: 36, fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{p.nome}</td>
                          <td style={{ fontWeight: 700, color: "var(--danger)" }}>
                            {p.quantidade} <span style={{ color: "var(--text-3)", fontSize: 12 }}>{p.unidade}</span>
                          </td>
                          <td>{p.custo > 0 ? fmt(p.custo) : <span style={{ color: "var(--text-3)" }}>—</span>}</td>
                          <td style={{ color: "var(--text-2)" }}>
                            {data.totalQtd > 0 ? `${((p.quantidade / data.totalQtd) * 100).toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Aba: Fechamentos ───────────────────────────────────────
type FechData = {
  de: string; ate: string; totalFechamentos: number;
  dias: { data: string; total: number; itens: { produto: string; unidade: string; quantidade: number; observacao: string | null }[] }[];
};

function TabFechamentos({ gerando, setGerando, pdfBtn }: { isMobile: boolean; gerando: boolean; setGerando: (v: boolean) => void; pdfBtn: (fn: () => void, d: boolean) => React.ReactNode }) {
  const [de,      setDe]      = useState(inicioMes());
  const [ate,     setAte]     = useState(hoje());
  const [data,    setData]    = useState<FechData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/relatorios/fechamentos?de=${de}&ate=${ate}`).then((res) => res.json());
    setData(r); setLoading(false);
  }, [de, ate]);

  useEffect(() => { buscar(); }, []);

  const handlePDF = async () => {
    if (!data) return;
    setGerando(true);
    try {
      const linhas: (string | number)[][] = [];
      data.dias.forEach((d) => {
        d.itens.forEach((item) => {
          linhas.push([fmtD(d.data), item.produto, `${item.quantidade} ${item.unidade}`, item.observacao ?? "—"]);
        });
      });
      await gerarPDF(
        "Histórico de Fechamentos",
        `${fmtD(data.de)} a ${fmtD(data.ate)}`,
        [{ label: "Fechamentos no Período", valor: String(data.totalFechamentos), cor: [59, 130, 246] }],
        [{ titulo: "Ajustes por Dia", colunas: ["Data", "Produto", "Qtd. Ajustada", "Observação"], linhas }],
        true
      );
    } finally { setGerando(false); }
  };

  return (
    <div>
      <FiltroPeriodo de={de} ate={ate} setDe={setDe} setAte={setAte} onBuscar={buscar} loading={loading} />
      {loading && <div className="card"><SkeletonTable rows={4} cols={2} /></div>}
      {!loading && data && (
        <>
          <div className="rel-card-header">
            <span className="card-title">{data.totalFechamentos} fechamento(s) no período</span>
            {pdfBtn(handlePDF, !data || data.dias.length === 0)}
          </div>

          {data.dias.length === 0
            ? <div className="card"><div className="empty-state"><div className="empty-icon"><IconInbox size={36} /></div><p>Nenhum fechamento no período</p></div></div>
            : data.dias.map((d) => (
              <div key={d.data} className="card" style={{ marginBottom: 12 }}>
                <div
                  className="card-header"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => setExpandido(expandido === d.data ? null : d.data)}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}><IconClipboardList size={15} /> Fechamento — {fmtD(d.data)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{d.itens.length} produto(s) ajustado(s)</div>
                  </div>
                  <span style={{ color: "var(--text-3)" }}>{expandido === d.data ? "▲" : "▼"}</span>
                </div>
                {expandido === d.data && (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Produto</th><th>Qtd. Ajustada</th><th>Observação</th></tr></thead>
                      <tbody>
                        {d.itens.map((item, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{item.produto}</td>
                            <td style={{ fontWeight: 700 }}>{item.quantidade} <span style={{ color: "var(--text-3)", fontSize: 12 }}>{item.unidade}</span></td>
                            <td style={{ color: "var(--text-3)", fontSize: 13 }}>{item.observacao ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          }
        </>
      )}
    </div>
  );
}
