import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { Toaster } from "sonner";
import Script from "next/script";
import ClientLayout from "@/components/ClientLayout";
import GlobalAnnouncement from "@/components/GlobalAnnouncement";
import GlobalAlert from "@/components/GlobalAlert";

export const metadata = {
  title: "PimPay - Core Ledger",
  description: "L'avenir de vos transactions Pi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      // Empêche les extensions de traduction de casser le DOM
      translate="no"
      className={`${GeistSans.variable} ${GeistMono.variable} dark notranslate`}
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="bg-[#02040a] text-white antialiased overflow-x-hidden notranslate selection:bg-blue-500/30">
        {/* Chargement prioritaire du SDK Pi */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />

        {/* 1. LAYER DE SÉCURITÉ (Maintenance, Banned, Freeze)
            Placé ici, il s'assure d'être au-dessus de tout le reste.
            Le div portal-root aide à prévenir les erreurs 'removeChild'.
        */}
        <div id="portal-root">
          <GlobalAlert />
        </div>

        {/* 2. LAYER D'INFORMATION (Bandeau d'annonce) */}
        <GlobalAnnouncement />

        {/* 3. LAYER APPLICATIF 
            Le ClientLayout gère l'état global et les providers.
        */}
        <div className="relative z-0">
          <ClientLayout>
            <main className="min-h-screen">
              {children}
            </main>
          </ClientLayout>
        </div>

        {/* 4. LAYER DE NOTIFICATION */}
        <Toaster
          position="top-center"
          richColors
          closeButton
          theme="dark"
          toastOptions={{
            className: 'bg-[#0b1120] border border-white/10 text-white rounded-2xl backdrop-blur-xl',
          }}
        />
      </body>
    </html>
  );
}
