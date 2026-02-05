import { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Recevoir Pi - PimPay',
  description: 'Générez votre QR Code et demandez des paiements Pi',
};

export default function ReceiveLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Le SDK Pi est injecté uniquement pour cette route et ses sous-pages.
          On utilise strategy="afterInteractive" pour qu'il se charge 
          juste après le rendu de la page.
      */}
      <Script 
        src="https://sdk.minepi.com/pi-sdk.js" 
        strategy="afterInteractive"
      />
      
      <div className="relative min-h-screen bg-[#020617]">
        {/* Tu peux ajouter ici un élément visuel commun à la section receive si besoin */}
        {children}
      </div>
    </>
  );
}
