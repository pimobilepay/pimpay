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
        {/* SDK PI NETWORK - Chargement critique */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />
        
        {/* Initialisation immediate du SDK Pi apres chargement */}
        <Script
          id="pi-sdk-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function initPiSDK() {
                if (typeof window === "undefined") return;
                
                function tryInit() {
                  if (window.Pi && !window.__PI_SDK_READY__ && !window.__PI_SDK_INITIALIZING__) {
                    try {
                      window.__PI_SDK_INITIALIZING__ = true;
                      window.Pi.init({ version: "2.0", sandbox: false });
                      window.__PI_SDK_READY__ = true;
                      window.__PI_SDK_INITIALIZING__ = false;
                      console.log("[PimPay] SDK Pi 2.0 initialise via script inline");
                    } catch (e) {
                      window.__PI_SDK_INITIALIZING__ = false;
                      if (e && e.message && e.message.includes("already")) {
                        window.__PI_SDK_READY__ = true;
                        console.log("[PimPay] SDK Pi deja initialise");
                      } else {
                        console.error("[PimPay] Erreur init SDK Pi:", e);
                      }
                    }
                  } else if (!window.Pi) {
                    // Reessayer dans 100ms si le SDK n'est pas encore charge
                    setTimeout(tryInit, 100);
                  }
                }
                
                // Essayer immediatement puis avec un delai
                if (document.readyState === "complete") {
                  tryInit();
                } else {
                  window.addEventListener("load", tryInit);
                }
                // Aussi essayer apres un court delai au cas ou
                setTimeout(tryInit, 500);
              })();
            `,
          }}
        />

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-W8HP6W3DM4"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
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
