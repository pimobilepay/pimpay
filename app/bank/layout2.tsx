import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Institution Financiere | PimPay',
  description: 'Portail Banquier - Reporting et monitoring des liquidites PimPay',
};

export default function BankLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-[#02040a] overflow-x-hidden">
      <div className="max-w-full">
        {children}
      </div>
    </div>
  );
}
