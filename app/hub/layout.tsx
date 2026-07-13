import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'PIMOBIPAY Hub | Agent Dashboard',
  description: 'Portail Agent - Gestion des transactions cash-in/cash-out PIMOBIPAY',
};

export default function HubLayout({
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
