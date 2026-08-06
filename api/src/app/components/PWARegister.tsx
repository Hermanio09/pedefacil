"use client";
import { useEffect, useState } from "react";
import { IconX, IconDownload, IconBell } from "./icons";

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installed,     setInstalled]     = useState(false);
  const [notifStatus,   setNotifStatus]   = useState<NotificationPermission>("granted");
  const [dismissed,     setDismissed]     = useState(true); // começa escondido até montar

  useEffect(() => {
    // Registrar Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Verificar se já foi dispensado
    const disp = localStorage.getItem("pwa-dismissed") === "1";

    // Verificar se já está instalado
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches;
    setInstalled(isInstalled);

    // Status atual de notificações
    const perm = "Notification" in window ? Notification.permission : "granted";
    setNotifStatus(perm);

    // Só mostra se: não dispensado E há algo para mostrar
    if (!disp && (!isInstalled || perm === "default")) {
      setDismissed(false);
    }

    // Capturar evento de instalação (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (localStorage.getItem("pwa-dismissed") !== "1") setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dispensar = () => {
    setDismissed(true);
    localStorage.setItem("pwa-dismissed", "1");
  };

  const instalar = async () => {
    if (!installPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (installPrompt as any).prompt();
    if (result?.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
    if (notifStatus !== "default") dispensar();
  };

  const pedirNotificacao = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
    dispensar(); // fecha após resposta (granted ou denied)

    if (perm === "granted" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      try {
        const key = urlBase64ToUint8Array(vapidKey);
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
        });
        await fetch("/api/push/subscribe", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(sub),
        });
      } catch {}
    }
  };

  const mostrarInstalar = installPrompt && !installed;
  const mostrarNotif    = notifStatus === "default";

  if (dismissed || (!mostrarInstalar && !mostrarNotif)) return null;

  return (
    <div style={{
      position:   "fixed",
      bottom:     16,
      right:      16,
      zIndex:     9999,
      display:    "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap:        8,
      maxWidth:   "calc(100vw - 32px)",
    }}>
      {/* Botão fechar */}
      <button
        onClick={dispensar}
        aria-label="Fechar"
        style={{
          width:        28,
          height:       28,
          borderRadius: "50%",
          border:       "1px solid var(--border)",
          background:   "var(--surface)",
          cursor:       "pointer",
          color:        "var(--text-2)",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          boxShadow:    "var(--shadow-sm)",
          flexShrink:   0,
        }}
      >
        <IconX size={14} />
      </button>

      {/* Botão instalar app (Android/Chrome) */}
      {mostrarInstalar && (
        <button
          onClick={instalar}
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          8,
            background:   "var(--primary-grad)",
            color:        "#fff",
            border:       "none",
            borderRadius: 12,
            padding:      "11px 18px",
            fontSize:     13,
            fontWeight:   600,
            cursor:       "pointer",
            boxShadow:    "0 4px 16px rgba(var(--primary-rgb),0.35)",
            whiteSpace:   "nowrap",
          }}
        >
          <IconDownload size={15} /> Instalar PedeFacil
        </button>
      )}

      {/* Botão ativar notificações */}
      {mostrarNotif && (
        <button
          onClick={pedirNotificacao}
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          8,
            background:   "var(--surface)",
            color:        "var(--text)",
            border:       "1px solid var(--border)",
            borderRadius: 12,
            padding:      "11px 18px",
            fontSize:     13,
            fontWeight:   600,
            cursor:       "pointer",
            boxShadow:    "var(--shadow-md)",
            whiteSpace:   "nowrap",
          }}
        >
          <IconBell size={15} /> Ativar notificações
        </button>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}
