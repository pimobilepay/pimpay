import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "PimPay - Core Ledger",
  description: "L'avenir de vos transactions Pi sur pimpay.pi",
  icons: {
    icon: "/logo-pimpay.png", // Utilise ton logo comme favicon
    apple: "/logo-pimpay.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <head>
        {/* Favicon et Logo */}
        <link rel="icon" href="/logo-pimpay.png" />
        
        {/* Chargement du SDK CinetPay pour les paiements internes */}
        <Script
          src="https://cdn.cinetpay.com/seamless/main.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
