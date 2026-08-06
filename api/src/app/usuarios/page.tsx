"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IconUsers, IconTrash } from "../components/icons";
import { SkeletonTable } from "../components/Skeleton";

type Usuario = { id: string; nome: string; email: string; role: string; ativo: boolean; criadoEm: string };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading]   = useState(true);

  const carregar = async () => {
    setLoading(true);
    const data = await fetch("/api/usuarios").then((r) => r.json());
    setUsuarios(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { carregar(); }, []);

  const alternarAtivo = async (u: Usuario) => {
    await fetch(`/api/usuarios/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !u.ativo }),
    });
    carregar();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este usuário?")) return;
    const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    if (res.ok) carregar();
    else { const d = await res.json(); alert(d.error ?? "Erro ao excluir."); }
  };

  const roleBadge = (role: string) => {
    if (role === "admin")    return <span className="badge badge-ok">Admin</span>;
    if (role === "gerente")  return <span className="badge badge-alerta">Gerente</span>;
    return <span className="badge badge-gray">Operador</span>;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Usuários</div>
          <div className="page-subtitle">{usuarios.length} usuário(s) cadastrado(s)</div>
        </div>
        <Link href="/usuarios/novo" className="btn btn-primary btn-sm">+ Novo Usuário</Link>
      </div>

      <div className="page-content">
        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <SkeletonTable rows={5} cols={6} />
            ) : usuarios.length === 0 ? (
              <div className="empty-state"><div className="empty-icon"><IconUsers size={36} /></div><p>Nenhum usuário cadastrado</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Criado em</th>
                    <th style={{ width: 120 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.55 }}>
                      <td style={{ fontWeight: 600 }}>{u.nome}</td>
                      <td style={{ color: "var(--text-2)" }}>{u.email}</td>
                      <td>{roleBadge(u.role)}</td>
                      <td>
                        <button
                          className={`badge ${u.ativo ? "badge-ok" : "badge-gray"}`}
                          style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
                          onClick={() => alternarAtivo(u)}
                          title="Clique para alternar status"
                        >
                          {u.ativo ? "Ativo" : "Inativo"}
                        </button>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--text-3)" }}>
                        {new Date(u.criadoEm).toLocaleDateString("pt-BR")}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Link href={`/usuarios/${u.id}/editar`} className="btn btn-secondary btn-sm">Editar</Link>
                          <button className="btn btn-danger btn-sm" onClick={() => excluir(u.id)}><IconTrash size={13} /></button>
                        </div>
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
