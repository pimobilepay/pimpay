import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Retrait | PimPay',
  description: 'Retirez vos fonds en toute sécurité vers votre wallet Pi ou compte bancaire.',
};

export default function WithdrawLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /* 🛡️ SÉCURITÉ : 
       On utilise un conteneur simple. La page de retrait doit être 
       la plus stable possible pour éviter les erreurs de saisie.
    */
    <div className="w-full animate-in slide-in-from-bottom-2 duration-500">
      {children}
    </div>
  );
}
