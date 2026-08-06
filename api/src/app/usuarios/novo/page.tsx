"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NovoUsuarioPage() {
  const router = useRouter();
  const [nome, setNome]         = useState("");
  const [email, setEmail]       = useState("");
  const [senha, setSenha]       = useState("");
  const [role, setRole]         = useState("operador");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState("");

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !senha.trim()) { setErro("Preencha todos os campos."); return; }
    if (senha.length < 6) { setErro("A senha deve ter pelo menos 6 caracteres."); return; }
    setSalvando(true); setErro("");
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha, role }),
    });
    setSalvando(false);
    if (res.ok) router.push("/usuarios");
    else { const d = await res.json(); setErro(d.error ?? "Erro ao criar usuário."); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Novo Usuário</div>
          <div className="page-subtitle">Criar acesso ao sistema</div>
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
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label>E-mail *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Senha *</label>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="form-group">
                <label>Perfil de acesso</label>
                <div className="chips-row">
                  {[
                    { v: "operador", l: "Operador" },
                    { v: "gerente",  l: "Gerente" },
                    { v: "admin",    l: "Admin" },
                  ].map(({ v, l }) => (
                    <button key={v} type="button" className={`chip ${role === v ? "active" : ""}`} onClick={() => setRole(v)}>{l}</button>
                  ))}
                </div>
                <div className="form-hint">
                  {role === "operador" && "Pode registrar entradas e saídas."}
                  {role === "gerente"  && "Acesso a relatórios e pedidos."}
                  {role === "admin"    && "Acesso completo, incluindo usuários e configurações."}
                </div>
              </div>

              <div className="divider" />
              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/usuarios" className="btn btn-secondary">Cancelar</Link>
                <button type="submit" className="btn btn-primary" disabled={salvando} style={{ flex: 1 }}>
                  {salvando ? "Criando…" : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
