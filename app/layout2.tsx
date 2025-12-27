import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { Toaster } from "sonner";
import Script from "next/script";
import ClientLayout from "@/components/ClientLayout";

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
    // translate="no" est indispensable pour éviter les erreurs removeChild dues aux traducteurs
    <html 
      lang="fr" 
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
      translate="no"
    >
      <body className="bg-[#020617] text-white antialiased overflow-x-hidden notranslate">
        {/* Chargement du SDK Pi - strategy beforeInteractive est parfait ici */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />

        <ClientLayout>
          {children}
        </ClientLayout>

        {/* Le Toaster ici est bien, mais richColors et closeButton aident à l'UX */}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
