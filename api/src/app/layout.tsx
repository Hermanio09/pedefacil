import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppWrapper from "./components/AppWrapper";
import PWARegister from "./components/PWARegister";

export const metadata: Metadata = {
  title:       "StockFacil — Controle de Estoque",
  description: "Controle inteligente de estoque para pequenos negócios",
  manifest:    "/manifest.webmanifest",
  appleWebApp: {
    capable:           true,
    statusBarStyle:    "default",
    title:             "StockFacil",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title:       "StockFacil",
    description: "Controle de estoque para pequenos negócios",
    type:        "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#047857" },
    { media: "(prefers-color-scheme: dark)",  color: "#0a1f19" },
  ],
  width:                 "device-width",
  initialScale:          1,
  maximumScale:          1,
  userScalable:          false,
  viewportFit:           "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* iOS PWA */}
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StockFacil" />
        {/* Aplica o tema salvo antes da página pintar, evitando flash da cor errada */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("pf-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AppWrapper>{children}</AppWrapper>
        <PWARegister />
      </body>
    </html>
  );
}
