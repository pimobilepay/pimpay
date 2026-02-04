import Script from "next/script";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#020617] relative">
      {/* On peut garder le Script ici par sécurité, 
        Next.js l'ignorera s'il est déjà chargé dans le Root Layout 
      */}
      <Script
        src="https://sdk.minepi.com/pi-sdk.js"
        strategy="beforeInteractive"
      />

      {/* Initialisation spécifique à la zone d'authentification */}
      <Script id="pi-init-auth" strategy="afterInteractive">
        {`
          if (window.Pi && !window.Pi.initialized) {
            window.Pi.init({ version: "2.0" });
            console.log("PimPay Auth: Protocole Pi initialisé");
          }
        `}
      </Script>

      {/* Contenu des pages login/signup */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Optionnel : Un léger dégradé de fond pour rester dans l'esprit PimPay */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.1),transparent)] pointer-events-none" />
    </div>
  );
}
