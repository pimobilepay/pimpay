import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "PimPay Wallet",
  description: "Gérez vos actifs GCV sur PimPay",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#020617] antialiased">
      {children}
    </div>
  );
}
