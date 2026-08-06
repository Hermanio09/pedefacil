"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import {
  IconGrid, IconBox, IconArrowDownCircle, IconArrowUpCircle, IconReceipt, IconArchive,
  IconTruck, IconClipboardList, IconCheckCircle, IconCalendar, IconChartBar, IconUsers, IconLogout,
} from "./icons";

type Me = { userId: string; nome: string; email: string; role: string } | null;

const BADGE_HREFS = ["/produtos", "/pedidos"];

const navBase = [
  { href: "/",             label: "Dashboard",    icon: IconGrid,            roles: ["admin","gerente","operador"] },
  { href: "/produtos",     label: "Produtos",     icon: IconBox,             roles: ["admin","gerente","operador"] },
  { href: "/entrada",      label: "Entrada",      icon: IconArrowDownCircle, roles: ["admin","gerente","operador"] },
  { href: "/saida",        label: "Saída",        icon: IconArrowUpCircle,  roles: ["admin","gerente","operador"] },
  { href: "/nota-fiscal",  label: "Nota Fiscal",  icon: IconReceipt,         roles: ["admin","gerente"] },
  { href: "/notas-fiscais", label: "Notas Lançadas", icon: IconArchive,      roles: ["admin","gerente"] },
  { href: "/fornecedores", label: "Fornecedores", icon: IconTruck,           roles: ["admin","gerente"] },
  { href: "/pedidos",      label: "Pedidos",      icon: IconClipboardList,   roles: ["admin","gerente"] },
  { href: "/fechamento",   label: "Fechamento",   icon: IconCheckCircle,     roles: ["admin","gerente","operador"] },
  { href: "/historico",    label: "Histórico",    icon: IconCalendar,        roles: ["admin","gerente"] },
  { href: "/relatorios",   label: "Relatórios",   icon: IconChartBar,        roles: ["admin","gerente"] },
  { href: "/usuarios",     label: "Usuários",     icon: IconUsers,           roles: ["admin"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen]       = useState(false);
  const [me, setMe]           = useState<Me>(null);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then(setMe);
    fetch("/api/stats").then((r) => r.ok ? r.json() : null).then((s) => {
      if (s?.produtosEmAlerta) setAlertCount(s.produtosEmAlerta);
    });
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Enquanto o role ainda não carregou, mostra só os itens liberados para todo mundo
  // (evita um flash mostrando itens restritos antes da permissão real chegar)
  const nav = me
    ? navBase.filter((item) => item.roles.includes(me.role))
    : navBase.filter((item) => item.roles.length === 3);

  const roleLabel = (r: string) => r === "admin" ? "Administrador" : r === "gerente" ? "Gerente" : "Operador";

  return (
    <>
      <button className="hamburger" onClick={() => setOpen(true)} aria-label="Menu">☰</button>
      <div className={`overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">🌿</div>
          <div className="logo-name">Pede<span>Facil</span></div>
        </div>

        {me && (
          <div style={{ padding: "12px 16px 14px", borderBottom: "1px solid var(--sidebar-border)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--sidebar-active-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {me.nome.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me.nome}</div>
              <div style={{ fontSize: 11, color: "var(--sidebar-text-dim)" }}>{roleLabel(me.role)}</div>
            </div>
          </div>
        )}

        <div className="sidebar-section">
          <div className="sidebar-section-label">Menu</div>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="nav-icon-wrap"><Icon size={16} strokeWidth={1.9} /></span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {BADGE_HREFS.includes(item.href) && alertCount > 0 && (
                  <span className="nav-badge">{alertCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ThemeToggle />
          <button
            onClick={logout}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(255,255,255,0.05)", border: "1px solid var(--sidebar-border)", borderRadius: 8, padding: "7px 12px", color: "var(--sidebar-text)", cursor: "pointer", fontSize: 13 }}
          >
            <IconLogout size={15} /> Sair
          </button>
          <div style={{ fontSize: 11, color: "var(--sidebar-text-dim)", textAlign: "center" }}>PedeFacil v1.0 · Beta</div>
        </div>
      </aside>
    </>
  );
}
