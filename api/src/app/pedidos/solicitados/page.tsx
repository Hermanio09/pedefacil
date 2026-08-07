"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IconTruck, IconSmartphone, IconMail, IconClipboardList, IconInbox } from "../../components/icons";
import { SkeletonTable } from "../../components/Skeleton";

type Fornecedor = { id: string; nome: string; telefone: string | null; email: string | null };
type Produto = {
  id: string; nome: string; unidade: string;
  estoqueAtual: number; estoqueMinimo: number;
  estoqueAbaixoMinimo: boolean;
  pedidoPendenteEm: string | null;
  fornecedor: Fornecedor | null;
};
type GrupoSolicitado = { fornecedor: Fornecedor | null; itens: Produto[] };

function tempoDesde(data: string): string {
  const ms = Date.now() - new Date(data).getTime();
  const horas = Math.floor(ms / 3_600_000);
  if (horas < 1)  return "há poucos minutos";
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias !== 1 ? "s" : ""}`;
}

export default function PedidosSolicitadosPage() {
  const [grupos, setGrupos]   = useState<GrupoSolicitado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/produtos")
      .then((r) => (r.ok ? r.json() : []))
      .then((produtos: Produto[]) => {
        // Já pedidos, ainda esperando a entrega chegar — some daqui sozinho assim que uma
        // entrada de estoque for lançada pro produto (o que limpa `pedidoPendenteEm`).
        const pendentes = produtos.filter((p) => p.estoqueAbaixoMinimo && p.pedidoPendenteEm);
        const mapa = new Map<string, GrupoSolicitado>();

        for (const p of pendentes) {
          const chave = p.fornecedor?.id ?? "__sem_fornecedor__";
          if (!mapa.has(chave)) mapa.set(chave, { fornecedor: p.fornecedor, itens: [] });
          mapa.get(chave)!.itens.push(p);
        }

        const lista = Array.from(mapa.values()).sort((a, b) => {
          if (!a.fornecedor) return 1;
          if (!b.fornecedor) return -1;
          return a.fornecedor.nome.localeCompare(b.fornecedor.nome);
        });

        setGrupos(lista);
        setLoading(false);
      });
  }, []);

  const totalItens = grupos.reduce((acc, g) => acc + g.itens.length, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Pedidos Solicitados</div>
          <div className="page-subtitle">
            {loading ? "Carregando…" : `${totalItens} produto(s) aguardando entrega`}
          </div>
        </div>
        <Link href="/pedidos" className="btn btn-secondary btn-sm"><IconClipboardList size={14} /> Voltar</Link>
      </div>

      <div className="page-content">
        {loading && <div className="card"><SkeletonTable rows={4} cols={3} /></div>}

        {!loading && totalItens === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><IconInbox size={36} /></div>
            <p style={{ fontWeight: 600 }}>Nada aguardando entrega</p>
            <small>Produtos pedidos aos fornecedores aparecem aqui até a mercadoria chegar.</small>
          </div>
        )}

        {grupos.map((grupo, gi) => (
          <div key={gi} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconTruck size={15} /> {grupo.fornecedor?.nome ?? "Sem fornecedor definido"}
                </span>
                {grupo.fornecedor && (
                  <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 13, color: "var(--text-3)" }}>
                    {grupo.fornecedor.telefone && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconSmartphone size={13} /> {grupo.fornecedor.telefone}</span>
                    )}
                    {grupo.fornecedor.email && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconMail size={13} /> {grupo.fornecedor.email}</span>
                    )}
                  </div>
                )}
              </div>
              <span className="badge badge-ok">{grupo.itens.length} item(s)</span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Estoque atual</th>
                    <th>Mínimo</th>
                    <th>Pedido enviado</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.itens.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.nome}</td>
                      <td className="stock-warn">{p.estoqueAtual} <span style={{ color: "var(--text-3)", fontSize: 12 }}>{p.unidade}</span></td>
                      <td style={{ color: "var(--text-2)" }}>{p.estoqueMinimo}</td>
                      <td style={{ color: "var(--text-2)" }}>{tempoDesde(p.pedidoPendenteEm!)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
