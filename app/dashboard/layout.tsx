import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "../globals.css";
import { Toaster } from "sonner";
import Script from "next/script";
import ClientLayout from "@/components/ClientLayout";
import GlobalAnnouncement from "@/components/GlobalAnnouncement";
import GlobalAlert from "@/components/GlobalAlert";
import { ThemeProvider } from "@/context/ThemeContext";

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
      /* IMPORTANT : On ajoute 'dark' ici par défaut pour PimPay */
      className={`${GeistSans.variable} ${GeistMono.variable} notranslate dark`}
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />

        {/* 1. STYLE CRITIQUE : Bloque le fond en noir immédiatement */}
        <style>{`
          html.dark { background-color: #02040a !important; }
          body.dark { background-color: #02040a !important; color: white !important; }
        `}</style>

        {/* 2. SCRIPT DE CORRECTION : Ne s'exécute que si l'utilisateur veut du CLAIR */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('pimpay-theme');
                  if (saved === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.backgroundColor = '#ffffff';
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>

      {/* Force le background sombre sur le body pour éviter le flash blanc de Next.js */}
      <body className="bg-[#02040a] text-white dark:bg-[#02040a] dark:text-white antialiased overflow-x-hidden notranslate selection:bg-blue-500/30">

        <ThemeProvider>
          {/* SDK Pi Network */}
          <Script
            src="https://sdk.minepi.com/pi-sdk.js"
            strategy="beforeInteractive"
          />

          <div id="portal-root">
            <GlobalAlert />
          </div>

          <GlobalAnnouncement />

          <ClientLayout>
            {children}
          </ClientLayout>

          <Toaster
            position="top-center"
            richColors
            closeButton
            /* Forcé en dark pour PimPay */
            theme="dark"
            toastOptions={{
              style: {
                borderRadius: '1rem',
                backdropFilter: 'blur(12px)',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
