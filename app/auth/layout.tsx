import Script from "next/script";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#020617] relative">
      {/* Le SDK est déjà chargé dans le Root Layout. 
        On garde celui-ci uniquement comme "Filet de sécurité" avec 'afterInteractive'
      */}
      <Script
        src="https://sdk.minepi.com/pi-sdk.js"
        strategy="afterInteractive"
      />

      {/* On ne force pas window.Pi.init ici. 
         C'est le Hook usePiAuth qui s'en chargera lors de l'appel 
         pour éviter les conflits de version.
      */}

      {/* Contenu des pages login/signup */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Effet visuel PimPay */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.1),transparent)] pointer-events-none" />
    </div>
  );
}
