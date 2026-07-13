import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: 'Paramètres | PIMOBIPAY',
  description: 'Configurez votre compte et votre sécurité PIMOBIPAY',
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020617",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // On rend simplement les enfants. 
  // Le RootLayout et le ClientLayout s'occupent déjà du reste.
  return <>{children}</>;
}
