"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NovoFornecedorPage() {
  const router = useRouter();
  const [nome, setNome]         = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail]       = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState("");

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { setErro("Informe o nome do fornecedor."); return; }

    setSalvando(true);
    setErro("");
    const res = await fetch("/api/fornecedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, telefone, email }),
    });

    if (res.ok) {
      router.push("/fornecedores");
    } else {
      const data = await res.json();
      setErro(data.error ?? "Erro ao salvar. Tente novamente.");
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Novo Fornecedor</div>
          <div className="page-subtitle">Cadastre um fornecedor para vincular aos produtos</div>
        </div>
        <Link href="/fornecedores" className="btn btn-secondary btn-sm">← Voltar</Link>
      </div>

      <div className="page-content">
        <div className="card" style={{ maxWidth: 680, margin: "0 auto" }}>
          <div className="card-header">
            <span className="card-title">Dados do fornecedor</span>
          </div>
          <div className="card-body">
            <form onSubmit={salvar}>
              {erro && (
                <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                  <div className="alert-icon">✕</div>
                  <div className="alert-content"><strong>{erro}</strong></div>
                </div>
              )}

              <div className="form-group">
                <label>Nome do fornecedor *</label>
                <input
                  type="text"
                  placeholder="Ex: Distribuidora Bebidas São Paulo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>
                  WhatsApp <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: 11 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
                <div className="form-hint">Número usado para enviar o pedido pelo WhatsApp</div>
              </div>

              <div className="form-group">
                <label>
                  E-mail <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(opcional)</span>
                </label>
                <input
                  type="email"
                  placeholder="Ex: pedidos@fornecedor.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="divider" />

              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/fornecedores" className="btn btn-secondary">Cancelar</Link>
                <button type="submit" className="btn btn-primary" disabled={salvando} style={{ flex: 1 }}>
                  {salvando ? "Salvando…" : "Salvar Fornecedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
