"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function EditarUsuarioPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [nome, setNome]         = useState("");
  const [email, setEmail]       = useState("");
  const [senha, setSenha]       = useState("");
  const [role, setRole]         = useState("operador");
  const [ativo, setAtivo]       = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [erro, setErro]         = useState("");

  useEffect(() => {
    fetch(`/api/usuarios/${id}`).then((r) => r.json()).then((u) => {
      setNome(u.nome ?? ""); setEmail(u.email ?? ""); setRole(u.role ?? "operador"); setAtivo(u.ativo ?? true);
      setLoading(false);
    });
  }, [id]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) { setErro("Nome e e-mail são obrigatórios."); return; }
    if (senha && senha.length < 6) { setErro("A nova senha deve ter pelo menos 6 caracteres."); return; }
    setSalvando(true); setErro("");
    const body: Record<string, unknown> = { nome, email, role, ativo };
    if (senha) body.senha = senha;
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSalvando(false);
    if (res.ok) router.push("/usuarios");
    else { const d = await res.json(); setErro(d.error ?? "Erro ao salvar."); }
  };

  if (loading) return <div className="page-content"><div className="empty-state"><div className="empty-icon">⏳</div><p>Carregando...</p></div></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Editar Usuário</div>
          <div className="page-subtitle">{nome}</div>
        </div>
        <Link href="/usuarios" className="btn btn-secondary btn-sm">← Voltar</Link>
      </div>

      <div className="page-content">
        <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <div className="card-header"><span className="card-title">Dados de acesso</span></div>
          <div className="card-body">
            <form onSubmit={salvar}>
              {erro && <div className="alert alert-danger" style={{ marginBottom: 20 }}><div className="alert-icon">✕</div><div className="alert-content"><strong>{erro}</strong></div></div>}

              <div className="form-group">
                <label>Nome completo *</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="form-group">
                <label>E-mail *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Nova senha <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(deixe em branco para não alterar)</span></label>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="form-group">
                <label>Perfil de acesso</label>
                <div className="chips-row">
                  {[{ v: "operador", l: "Operador" }, { v: "gerente", l: "Gerente" }, { v: "admin", l: "Admin" }].map(({ v, l }) => (
                    <button key={v} type="button" className={`chip ${role === v ? "active" : ""}`} onClick={() => setRole(v)}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <div className="chips-row">
                  <button type="button" className={`chip ${ativo ? "active" : ""}`} onClick={() => setAtivo(true)}>Ativo</button>
                  <button type="button" className={`chip ${!ativo ? "active" : ""}`} onClick={() => setAtivo(false)}>Inativo</button>
                </div>
              </div>

              <div className="divider" />
              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/usuarios" className="btn btn-secondary">Cancelar</Link>
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
