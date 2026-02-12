import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Administration | PimPay',
  description: 'Portail de gestion sécurisé PimPay',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /* 🛡️ SÉCURITÉ : On utilise une div parente simple. 
       Le style 'dark' et le fond sont déjà gérés par le layout racine.
    */
    <div className="min-h-screen w-full bg-[#02040a] admin-layer">
      {/* Ici, tu pourras ajouter une Sidebar spécifique 
          pour les administrateurs plus tard. 
      */}
      <div className="flex flex-col">
        {children}
      </div>
    </div>
  );
}
