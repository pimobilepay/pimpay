import type { Metadata } from "next";
import BusinessClientLayout from "./BusinessClientLayout";

export const metadata: Metadata = {
  title: 'Business | PimPay',
  description: 'Portail Entreprise - Gestion des salaires et trésorerie PimPay',
};

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-[#02040a]">
      <BusinessClientLayout>{children}</BusinessClientLayout>
    </div>
  );
}
