import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Business | PimPay',
  description: 'Portail Entreprise - Gestion des salaires et tresorerie PimPay',
};

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-[#02040a]">
      {children}
    </div>
  );
}
