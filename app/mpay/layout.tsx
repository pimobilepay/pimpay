import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Paiement Rapide | PIMOBIPAY',
  description: 'Effectuez des transferts instantanés sur le réseau Pi Network.',
};

export default function MpayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /* 🛡️ OPTIMISATION UX : 
       On utilise une section avec une animation fluide. 
       L'utilisateur doit sentir que l'interface est "légère".
    */
    <section className="w-full min-h-screen animate-in fade-in slide-in-from-right-4 duration-500">
      {children}
    </section>
  );
}
