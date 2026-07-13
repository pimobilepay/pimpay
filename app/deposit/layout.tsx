import type { Metadata } from "next";

// Les métadonnées spécifiques à la page de dépôt
export const metadata: Metadata = {
  title: "Dépôt | PIMOBIPAY",
  description: "Approvisionnez votre compte PIMOBIPAY via Pi Network ou CinetPay.",
};

export default function DepositLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* 🛡️ SÉCURITÉ & PERFORMANCE : 
       Pas de balises de structure globale ici. 
       On utilise un conteneur qui respecte le thème sombre de PIMOBIPAY.
    */
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#02040a] animate-in fade-in zoom-in-95 duration-500">
      {children}
    </div>
  );
}
