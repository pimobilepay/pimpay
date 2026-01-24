import "@/app/globals.css";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { Metadata } from "next";
import Script from "next/script";

import { Toaster } from "sonner";
import ClientLayout from "@/components/ClientLayout";
import GlobalAnnouncement from "@/components/GlobalAnnouncement";
import GlobalAlert from "@/components/GlobalAlert";
import { ThemeProvider } from "@/context/ThemeContext";
// IMPORTÉ : Le context PiAuth
import { PiAuthProvider } from "@/context/pi-auth-context";

export const metadata: Metadata = {
  title: "PimPay - Core Ledger",
  description: "L'avenir de vos transactions Pi",
};

export default function DashboardLayout({
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
      style={{ colorScheme: "dark" }}
    >
      <head>
        <meta name="google" content="notranslate" />

        <style>{`
          html.dark { background-color: #02040a !important; }
          body.dark {
            background-color: #02040a !important;
            color: white !important;
          }
        `}</style>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const theme = localStorage.getItem("pimpay-theme");
                  if (theme === "light") {
                    document.documentElement.classList.remove("dark");
                    document.documentElement.style.backgroundColor = "#ffffff";
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>

      <body className="antialiased overflow-x-hidden notranslate bg-[#02040a] text-white selection:bg-blue-500/30">
        <ThemeProvider>
          {/* AJOUTÉ : PiAuthProvider doit envelopper les composants qui utilisent usePiAuth */}
          <PiAuthProvider>
            <Script
              src="https://sdk.minepi.com/pi-sdk.js"
              strategy="beforeInteractive"
            />

            <Script id="pi-init" strategy="afterInteractive">
              {`
                if (window.Pi) {
                  window.Pi.init({ version: "2.0" });
                }
              `}
            </Script>

            <div id="portal-root">
              <GlobalAlert />
            </div>

            <GlobalAnnouncement />

            <ClientLayout>{children}</ClientLayout>

            <Toaster
              position="top-center"
              richColors
              closeButton
              theme="dark"
              toastOptions={{
                style: {
                  borderRadius: "1rem",
                  backdropFilter: "blur(12px)",
                },
              }}
            />
          </PiAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
