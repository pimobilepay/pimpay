import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { Toaster } from "sonner";
import Script from "next/script";
import ClientLayout from "@/components/ClientLayout";
import GlobalAnnouncement from "@/components/GlobalAnnouncement";

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
      // translate="no" et "notranslate" sont cruciaux pour éviter que Google Translate 
      // n'insère des balises <font> qui cassent le Virtual DOM de React.
      translate="no"
      className={`${GeistSans.variable} ${GeistMono.variable} dark notranslate`}
    >
      <head>
        {/* Meta tag supplémentaire pour bloquer la traduction automatique de Google */}
        <meta name="google" content="notranslate" />
      </head>
      <body className="bg-[#020617] text-white antialiased overflow-x-hidden notranslate">
        {/* Le SDK Pi est chargé avant l'interactivité. 
          L'utilisation de "beforeInteractive" évite les conflits d'hydratation.
        */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />

        {/* 1. Bandeau d'annonce 
          Placé à l'extérieur du ClientLayout pour éviter les erreurs de désynchronisation 
          si le layout client subit une re-hydratation lourde.
        */}
        <GlobalAnnouncement />

        {/* 2. ClientLayout 
          Contient tes Context Providers. On s'assure qu'il est bien séparé 
          des scripts externes pour stabiliser l'arbre DOM.
        */}
        <ClientLayout>
          {children}
        </ClientLayout>

        {/* 3. Toaster 
          On le force en mode dark pour correspondre au body et on évite 
          qu'il ne soit injecté trop haut dans le DOM.
        */}
        <Toaster 
          position="top-center" 
          richColors 
          closeButton 
          theme="dark"
        />
      </body>
    </html>
  );
}
