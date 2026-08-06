"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]   = useState("");
  const [senha, setSenha]   = useState("");
  const [erro, setErro]     = useState("");
  const [loading, setLoading] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { router.push("/"); router.refresh(); }
    else setErro(data.error ?? "Erro ao entrar.");
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(circle at 20% 20%, #0e2921 0%, #0a1f19 45%, #08150f 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: "-10%", right: "-8%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.16) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: "-15%", left: "-10%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(5,150,105,0.22) 0%, transparent 70%)" }} />

      <div style={{ width: "100%", maxWidth: 420, padding: "0 16px", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, margin: "0 auto 16px", borderRadius: 16,
            background: "linear-gradient(135deg, #f59e0b, #b45309)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
            boxShadow: "0 8px 24px rgba(217,119,6,0.35)",
          }}>
            🌿
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
            Pede<span style={{
              background: "linear-gradient(135deg, #6ee7b7, #34d399)",
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            }}>Facil</span>
          </div>
          <div style={{ color: "#8ba89c", fontSize: 14, marginTop: 6 }}>
            Controle de estoque para bares e restaurantes
          </div>
        </div>

        <div style={{ background: "var(--surface)", borderRadius: 20, padding: "32px 28px", boxShadow: "0 24px 60px rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "var(--text)" }}>
            Entrar na plataforma
          </div>

          <form onSubmit={entrar}>
            {erro && (
              <div style={{ background: "var(--danger-light)", border: "1px solid var(--danger-border)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "var(--danger-dark)", fontSize: 14 }}>
                {erro}
              </div>
            )}

            <div className="form-group">
              <label>E-mail</label>
              <input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <input type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#6d8579" }}>
          PedeFacil v1.0 · Beta
        </div>
      </div>
    </div>
  );
}
