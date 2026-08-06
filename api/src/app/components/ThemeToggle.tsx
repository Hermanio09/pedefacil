"use client";
import { useEffect, useState } from "react";
import { IconMonitor, IconSun, IconMoon } from "./icons";

type ThemeMode = "system" | "light" | "dark";

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const salvo = localStorage.getItem("pf-theme");
    setMode(salvo === "dark" || salvo === "light" ? salvo : "system");
  }, []);

  const aplicar = (novo: ThemeMode) => {
    setMode(novo);
    if (novo === "system") {
      localStorage.removeItem("pf-theme");
      document.documentElement.removeAttribute("data-theme");
    } else {
      localStorage.setItem("pf-theme", novo);
      document.documentElement.setAttribute("data-theme", novo);
    }
  };

  return (
    <div className="theme-toggle" role="group" aria-label="Tema da plataforma">
      <button type="button" title="Automático (segue o sistema)" className={mode === "system" ? "active" : ""} onClick={() => aplicar("system")}>
        <IconMonitor size={15} />
      </button>
      <button type="button" title="Tema claro" className={mode === "light" ? "active" : ""} onClick={() => aplicar("light")}>
        <IconSun size={15} />
      </button>
      <button type="button" title="Tema escuro" className={mode === "dark" ? "active" : ""} onClick={() => aplicar("dark")}>
        <IconMoon size={15} />
      </button>
    </div>
  );
}
