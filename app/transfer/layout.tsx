import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Transfert de fonds | PIMOBIPAY',
  description: 'Envoyez des Pi instantanément à d’autres utilisateurs PIMOBIPAY.',
};

export default function TransferLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /* 🛡️ SÉCURITÉ TRANSACTIONNELLE : 
       Une structure simplifiée garantit que les validateurs de formulaires 
       (comme Zod ou React Hook Form) fonctionnent sans interférences.
    */
    <main className="w-full min-h-screen py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {children}
    </main>
  );
}
