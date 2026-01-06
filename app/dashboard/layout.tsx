import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "../globals.css"; // Ajout d'un point supplémentaire pour remonter au dossier parent
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
      translate="no"
      className={`${GeistSans.variable} ${GeistMono.variable} dark notranslate`}
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="bg-[#02040a] text-white antialiased overflow-x-hidden notranslate selection:bg-blue-500/30">
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />

        <div id="portal-root">
          <GlobalAlert />
        </div>

        <GlobalAnnouncement />

        {/* ClientLayout contient ton SideMenu et gère l'affichage du contenu central */}
        <ClientLayout>
          {children}
        </ClientLayout>

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
