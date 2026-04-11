import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Mobile Wallet | PimPay',
  description: 'Gérez vos actifs Pi et vos transactions en temps réel',
};

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /* 🛡️ SÉCURITÉ & UX : 
       Le conteneur du Wallet doit être prêt pour le streaming (loading.tsx).
       On ne remet pas de <html> ou <body> ici.
    */
    <section className="w-full h-full animate-in fade-in duration-500">
      {children}
    </section>
  );
}
