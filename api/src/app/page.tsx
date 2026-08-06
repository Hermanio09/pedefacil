"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SkeletonTable, SkeletonStatCards } from "./components/Skeleton";
import {
  IconBox, IconAlertTriangle, IconArrowDownCircle, IconArrowUpCircle,
  IconClipboardList, IconCheckCircle, IconChartBar, IconWhatsapp,
} from "./components/icons";

type Produto = {
  id: string; nome: string; unidade: string;
  estoqueAtual: number; estoqueMinimo: number; estoqueAbaixoMinimo: boolean;
  fornecedor?: { nome: string; whatsapp: string | null };
};

type Stats = { totalProdutos: number; produtosEmAlerta: number; entradasHoje: number; saidasHoje: number };

export default function Dashboard() {
  const [produtos, setProdutos]     = useState<Produto[]>([]);
  const [stats, setStats]           = useState<Stats | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/produtos").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
    ]).then(([p, s]) => {
      setProdutos(p);
      setStats(s);
      setLoading(false);
    });
  }, []);

  const emAlerta = produtos.filter((p) => p.estoqueAbaixoMinimo);

  const abrirWhatsAppAlerta = () => {
    if (emAlerta.length === 0) return;
    const linhas = emAlerta
      .map((p) => `• ${p.nome}: ${p.estoqueAtual} ${p.unidade} (mín: ${p.estoqueMinimo})`)
      .join("\n");
    const msg = `⚠ Alerta de estoque baixo — PedeFacil\n\n${linhas}\n\nPor favor, providenciar reposição.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Visão geral do estoque</div>
        </div>
        {emAlerta.length > 0 && (
          <button className="btn btn-warning btn-sm" onClick={abrirWhatsAppAlerta}>
            <IconWhatsapp size={15} /> Alerta WhatsApp ({emAlerta.length})
          </button>
        )}
      </div>

      <div className="page-content">
        {/* Stat cards */}
        {loading ? <SkeletonStatCards /> : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon green"><IconBox size={20} /></div>
            <div>
              <div className="stat-value">{stats?.totalProdutos ?? 0}</div>
              <div className="stat-label">Produtos</div>
              <div className="stat-sub">cadastrados</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><IconAlertTriangle size={20} /></div>
            <div>
              <div className="stat-value" style={{ color: (stats?.produtosEmAlerta ?? 0) > 0 ? "var(--danger)" : undefined }}>
                {stats?.produtosEmAlerta ?? 0}
              </div>
              <div className="stat-label">Em alerta</div>
              <div className="stat-sub">abaixo do mínimo</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><IconArrowDownCircle size={20} /></div>
            <div>
              <div className="stat-value">{stats?.entradasHoje ?? 0}</div>
              <div className="stat-label">Entradas hoje</div>
              <div className="stat-sub">unidades</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><IconArrowUpCircle size={20} /></div>
            <div>
              <div className="stat-value">{stats?.saidasHoje ?? 0}</div>
              <div className="stat-label">Saídas hoje</div>
              <div className="stat-sub">unidades</div>
            </div>
          </div>
        </div>
        )}

        {/* Card de alertas melhorado */}
        {!loading && emAlerta.length > 0 && (() => {
          const criticos = emAlerta.filter((p) => p.estoqueAtual === 0);
          const baixos   = emAlerta.filter((p) => p.estoqueAtual > 0);
          return (
            <div className="alert-card">
              <div className="alert-card-header">
                <div className="alert-card-title">
                  <span className="alert-card-icon"><IconAlertTriangle size={17} /></span>
                  {emAlerta.length} produto{emAlerta.length > 1 ? "s" : ""} precisam de atenção
                </div>
                <Link href="/pedidos" className="btn btn-danger btn-sm">
                  <IconClipboardList size={14} /> Fazer Pedido →
                </Link>
              </div>

              {criticos.length > 0 && (
                <div className="alert-card-section">
                  <div className="alert-card-section-label alert-card-label-critico">
                    Estoque zerado — repor imediatamente
                  </div>
                  <div className="alert-card-list">
                    {criticos.map((p) => (
                      <div key={p.id} className="alert-card-item alert-card-item-critico">
                        <span className="alert-card-item-nome">{p.nome}</span>
                        <span className="alert-card-item-qtd">0 {p.unidade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {baixos.length > 0 && (
                <div className="alert-card-section">
                  <div className="alert-card-section-label alert-card-label-baixo">
                    Estoque baixo — abaixo do mínimo
                  </div>
                  <div className="alert-card-list">
                    {baixos.map((p) => (
                      <div key={p.id} className="alert-card-item alert-card-item-baixo">
                        <span className="alert-card-item-nome">{p.nome}</span>
                        <span className="alert-card-item-qtd">{p.estoqueAtual} {p.unidade} / mín {p.estoqueMinimo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}


        {/* Quick actions */}
        <div className="actions-grid">
          <Link href="/entrada" className="action-card">
            <div className="ac-icon" style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}><IconArrowDownCircle size={22} /></div>
            <div className="ac-label">Registrar Entrada</div>
            <div className="ac-desc">Nova compra</div>
          </Link>
          <Link href="/saida" className="action-card">
            <div className="ac-icon" style={{ background: "var(--danger-light)", color: "var(--danger-dark)" }}><IconArrowUpCircle size={22} /></div>
            <div className="ac-label">Registrar Saída</div>
            <div className="ac-desc">Saída rápida</div>
          </Link>
          <Link href="/fechamento" className="action-card">
            <div className="ac-icon" style={{ background: "var(--info-light)", color: "var(--info)" }}><IconCheckCircle size={22} /></div>
            <div className="ac-label">Fechamento do Dia</div>
            <div className="ac-desc">Contagem final</div>
          </Link>
          <Link href="/relatorios" className="action-card">
            <div className="ac-icon" style={{ background: "var(--accent-light)", color: "var(--on-accent)" }}><IconChartBar size={22} /></div>
            <div className="ac-label">Relatórios</div>
            <div className="ac-desc">Custos e estoque</div>
          </Link>
        </div>

        {/* Products table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Estoque Atual</span>
            <Link href="/produtos" className="btn btn-secondary btn-sm">Ver todos</Link>
          </div>
          <div className="table-wrap">
            {loading ? (
              <SkeletonTable rows={6} cols={5} />
            ) : produtos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><IconBox size={36} /></div>
                <p>Nenhum produto cadastrado</p>
                <small><Link href="/produtos/novo">Adicionar primeiro produto →</Link></small>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Unidade</th>
                    <th>Estoque</th>
                    <th>Mínimo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.nome}</td>
                      <td><span className="badge badge-gray">{p.unidade}</span></td>
                      <td className={p.estoqueAbaixoMinimo ? "stock-warn" : "stock-ok"}>{p.estoqueAtual}</td>
                      <td style={{ color: "var(--text-2)" }}>{p.estoqueMinimo}</td>
                      <td>
                        {p.estoqueAbaixoMinimo
                          ? <span className="badge badge-alerta">⚠ Baixo</span>
                          : <span className="badge badge-ok">✓ OK</span>}
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
