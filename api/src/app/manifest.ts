import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PedeFacil — Controle de Estoque",
    short_name: "PedeFacil",
    description: "Controle inteligente de estoque para pequenos negócios",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#059669",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [],
    shortcuts: [
      { name: "Entrada",   short_name: "Entrada",   url: "/entrada",   icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Saída",     short_name: "Saída",     url: "/saida",     icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Pedidos",   short_name: "Pedidos",   url: "/pedidos",   icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Relatórios",short_name: "Relatórios",url: "/relatorios",icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
