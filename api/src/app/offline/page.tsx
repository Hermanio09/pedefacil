"use client";

export default function OfflinePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📡</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Sem conexão</div>
      <div style={{ fontSize: 15, color: "#64748b", maxWidth: 300, lineHeight: 1.6 }}>
        Você está offline. Verifique sua conexão e tente novamente.
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{ marginTop: 24, padding: "12px 28px", background: "#059669", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
