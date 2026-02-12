import type { Metadata } from "next";

// Les métadonnées spécifiques à la page de dépôt
export const metadata: Metadata = {
  title: "Dépôt | PimPay",
  description: "Approvisionnez votre compte PimPay via Pi Network ou CinetPay.",
};

export default function DepositLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* 🛡️ SÉCURITÉ & PERFORMANCE : 
       Pas de balises de structure globale ici. 
       On utilise un conteneur qui respecte le thème sombre de PimPay.
    */
    <div className="w-full min-h-[calc(100-vh-4rem)] bg-[#02040a] animate-in fade-in zoom-in-95 duration-500">
      {children}
    </div>
  );
}
