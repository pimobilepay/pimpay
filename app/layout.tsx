import "@/app/globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { headers } from "next/headers";

import { Toaster } from "sonner";
import ClientLayout from "@/components/ClientLayout";
import GlobalAnnouncement from "@/components/GlobalAnnouncement";
import GlobalAlert from "@/components/GlobalAlert";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { PiInitializer } from "@/components/PiInitializer";
import SessionGuard from "@/components/auth/SessionGuard";

export const viewport: Viewport = {
  themeColor: "#02040a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "PimPay - Core Ledger",
  description: "L'avenir de vos transactions Pi sur pimpay.pi",
  robots: "noindex, nofollow",
  icons: {
    icon: "/logo-pimpay.png",
  }
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // [FIX #9] Lire le nonce généré par proxy.ts — transmis via header X-Nonce
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? "";

  return (
    <html
      lang="fr"
      translate="no"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} notranslate dark`}
    >
      <head>
        <meta name="google" content="notranslate" />
        {/* [FIX #9] nonce injecté — le navigateur n'exécute que les scripts portant ce nonce */}
        <script
          id="theme-strategy"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const theme = localStorage.getItem("pimpay-theme") || 'dark';
                  document.documentElement.classList.toggle("dark", theme === "dark");
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>

      <body className="antialiased overflow-x-hidden notranslate bg-[#02040a] text-white selection:bg-blue-500/30">
        {/* SDK PI NETWORK - Chargement critique */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
          nonce={nonce}
        />

        {/*
          NOTE: L'initialisation du SDK Pi est geree UNIQUEMENT par <PiInitializer />.
          Un ancien script inline forcait ici `Pi.init({ sandbox: false })` de maniere
          immediate, ce qui entrait en concurrence avec PiInitializer/usePiAuth (qui, eux,
          respectent le mode reseau configure par l'admin via /api/pi-network).
          Comme le SDK Pi ne peut etre initialise QU'UNE SEULE FOIS, le premier appel
          gagnait la course : selon le timing, le SDK etait parfois initialise sur le
          mauvais reseau -> login "qui marche parfois" + deconnexions.
          On laisse donc PiInitializer etre le point d'initialisation unique et coherent.
        */}

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-W8HP6W3DM4"
          strategy="afterInteractive"
          nonce={nonce}
        />
        <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-W8HP6W3DM4');
          `}
        </Script>

        <LanguageProvider>
          <CurrencyProvider>
            <ThemeProvider>
              <SessionGuard>
              <PiInitializer />

              <div id="portal-root">
                <GlobalAlert />
              </div>

              <GlobalAnnouncement />

              <ClientLayout>{children}</ClientLayout>

            <Script
              src="https://cdn.cinetpay.com/seamless/main.js"
              strategy="lazyOnload"
              nonce={nonce}
            />

              <Toaster
                position="top-center"
                richColors
                expand={false}
                theme="dark"
                toastOptions={{
                  style: {
                    borderRadius: "1rem",
                    background: "rgba(15, 23, 42, 0.8)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  },
                }}
              />
              </SessionGuard>
            </ThemeProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
