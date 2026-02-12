import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Échange (Swap) | PimPay',
  description: 'Convertissez vos actifs instantanément au meilleur taux sur PimPay.',
};

export default function SwapLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /* 🛡️ PERFORMANCE : 
       Le Swap utilise souvent des calculs en temps réel. 
       Un DOM allégé permet des mises à jour de prix plus fluides.
    */
    <div className="w-full h-full animate-in slide-in-from-left-4 fade-in duration-500">
      {children}
    </div>
  );
}
