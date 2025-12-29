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
      // Sécurité anti-traduction pour éviter les erreurs Node.removeChild
      translate="no"
      className={`${GeistSans.variable} ${GeistMono.variable} dark notranslate`}
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="bg-[#02040a] text-white antialiased overflow-x-hidden notranslate selection:bg-blue-500/30">
        {/* Chargement du SDK Pi */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />

        {/* CORRECTION : Le contenu dynamique est enveloppé dans ClientLayout 
          ou rendu de manière à ce que le SSR et le Client soient synchronisés.
        */}
        <div id="portal-root">
          <GlobalAlert />
        </div>

        <GlobalAnnouncement />

        {/* STRUCTURE : On s'assure que le contenu principal est bien géré 
          Le z-index et la position relative sont maintenus.
        */}
        <div className="relative z-0">
          <ClientLayout>
            <main className="min-h-[100dvh]">
              {children}
            </main>
          </ClientLayout>
        </div>

        <Toaster
          position="top-center"
          richColors
          closeButton
          theme="dark"
          toastOptions={{
            style: {
              background: '#0b1120',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              borderRadius: '1rem',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
      </body>
    </html>
  );
}
