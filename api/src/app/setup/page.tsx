"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RAMOS = ["Restaurante", "Padaria", "Mercado", "Lanchonete", "Farmácia", "Pet Shop", "Outro"];

export default function SetupPage() {
  const router = useRouter();
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [ramo, setRamo]               = useState("Restaurante");
  const [nome, setNome]               = useState("");
  const [email, setEmail]             = useState("");
  const [senha, setSenha]             = useState("");
  const [salvando, setSalvando]       = useState(false);
  const [erro, setErro]               = useState("");

  useEffect(() => {
    fetch("/api/setup").then((r) => r.json()).then((d) => {
      if (!d.precisaSetup) router.push("/login");
    });
  }, [router]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmpresa.trim() || !nome.trim() || !email.trim() || !senha.trim()) {
      setErro("Preencha todos os campos."); return;
    }
    setSalvando(true); setErro("");
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomeEmpresa, ramo, nome, email, senha }),
    });
    setSalvando(false);
    if (res.ok) router.push("/login");
    else { const d = await res.json(); setErro(d.error ?? "Erro ao criar conta."); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-1)" }}>
            Pede<span style={{ color: "var(--primary)" }}>Facil</span>
          </div>
          <div style={{ fontSize: 14, color: "var(--text-3)", marginTop: 4 }}>Configuração inicial — crie sua conta</div>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={salvar}>
              {erro && (
                <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                  <div className="alert-icon">✕</div>
                  <div className="alert-content"><strong>{erro}</strong></div>
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Dados da Empresa</div>

              <div className="form-group">
                <label>Nome da empresa *</label>
                <input type="text" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Ex: Restaurante do João" autoFocus />
              </div>

              <div className="form-group">
                <label>Ramo de atividade</label>
                <div className="chips-row" style={{ flexWrap: "wrap" }}>
                  {RAMOS.map((r) => (
                    <button key={r} type="button" className={`chip ${ramo === r ? "active" : ""}`} onClick={() => setRamo(r)}>{r}</button>
                  ))}
                </div>
              </div>

              <div className="divider" />
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Conta de Administrador</div>

              <div className="form-group">
                <label>Seu nome *</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="form-group">
                <label>E-mail *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
              </div>
              <div className="form-group">
                <label>Senha *</label>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={salvando} style={{ marginTop: 8 }}>
                {salvando ? "Criando conta…" : "Criar Conta e Entrar →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
