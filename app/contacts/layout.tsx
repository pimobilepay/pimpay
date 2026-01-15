import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: 'Contact | PimPay Support',
  description: 'Besoin d’aide ? Contactez l’équipe PimPay.',
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#020617] antialiased">
      {children}
    </div>
  )
}
