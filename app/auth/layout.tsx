import Script from "next/script";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* Charger le SDK */}
        <Script 
          src="https://sdk.minepi.com/pi-sdk.js" 
          strategy="beforeInteractive" 
        />
        
        {/* INITIALISER LE SDK (Indispensable pour PimPay) */}
        <Script id="pi-init-auth" strategy="afterInteractive">
          {`
            if (window.Pi) {
              window.Pi.init({ version: "2.0" });
              console.log("PimPay Auth: Protocole Pi initialisé");
            }
          `}
        </Script>

        {children}
      </body>
    </html>
  );
}
