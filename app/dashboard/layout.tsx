import ClientLayout from "@/components/ClientLayout";

// 🛡️ Audit de Sécurité : On ne définit pas de metadata ici si elles sont 
// déjà dans la racine, sauf si on veut surcharger le titre.
export const metadata = {
  title: "Dashboard | PimPay",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* INTERDIT EN V16 : Pas de <html> ni de <body> ici ! 
       Ils sont déjà fournis par app/layout.tsx
    */
    <div className="flex min-h-screen w-full flex-col bg-[#02040a]">
      {/* On garde ClientLayout car c'est lui qui gère la navigation latérale */}
      <ClientLayout>
        <main className="flex-1">
          {children}
        </main>
      </ClientLayout>
    </div>
  );
}
