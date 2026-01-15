import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: 'Retrait | PimPay',
  description: 'Effectuez vos retraits sécurisés sur PimPay',
}

// Configuration du viewport pour éviter les zooms intempestifs sur mobile lors de la saisie des montants
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function WithdrawLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section className="min-h-screen bg-[#020617] antialiased relative overflow-x-hidden">
      {children}
    </section>
  )
}
