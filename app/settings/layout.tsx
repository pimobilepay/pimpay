import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: 'Paramètres | PimPay',
  description: 'Configurez votre compte et votre sécurité PimPay',
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-[#020617] antialiased">
      {children}
    </main>
  )
}
