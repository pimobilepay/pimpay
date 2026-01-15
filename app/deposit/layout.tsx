import { Inter } from "next/font/google";
import "@/app/globals.css";
// ✅ AJOUTE CETTE LIGNE :
import Script from "next/script"; 

const inter = Inter({ subsets: ["latin"] });

export default function DepositLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen">
      {/* Note : Si c'est le layout racine (RootLayout), 
         garde les balises <html> et <body>. 
         Si c'est un sous-layout (DepositLayout), garde juste le contenu.
      */}
      <Script
        src="https://sdk.minepi.com/pi-sdk.js"
        strategy="beforeInteractive"
      />
      {children}
    </div>
  );
}
