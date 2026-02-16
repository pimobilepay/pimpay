import "@/app/globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { Metadata, Viewport } from "next"; 
import Script from "next/script";

import { Toaster } from "sonner";
import ClientLayout from "@/components/ClientLayout";
import GlobalAnnouncement from "@/components/GlobalAnnouncement";
import GlobalAlert from "@/components/GlobalAlert";
import { ThemeProvider } from "@/context/ThemeContext";
import { PiInitializer } from "@/components/PiInitializer";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      translate="no"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} notranslate dark`}
    >
      <head>
        <meta name="google" content="notranslate" />

        {/* 1. SDK PI NETWORK - Chargement critique */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />

        {/* L'initialisation du SDK Pi est geree par PiInitializer.tsx
            pour eviter les doubles appels a Pi.init() */}

        <script
          id="theme-strategy"
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
        <ThemeProvider>
          {/* Gère l'authentification et les scopes 'payments' */}
          <PiInitializer />

          <div id="portal-root">
            <GlobalAlert />
          </div>

          <GlobalAnnouncement />

          <ClientLayout>{children}</ClientLayout>

          {/* CinetPay en lazy pour ne pas ralentir le login Pi */}
          <Script
            src="https://cdn.cinetpay.com/seamless/main.js"
            strategy="lazyOnload"
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
        </ThemeProvider>
      </body>
    </html>
  );
}
