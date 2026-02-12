import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Centre d’aide | PimPay',
  description: 'Besoin d’aide avec vos transactions Pi ? Notre équipe est là pour vous accompagner.',
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /* 🛡️ STABILITÉ : 
       On utilise un conteneur simple. Le support inclut souvent 
       des formulaires ou des chats, qui détestent les conflits de DOM.
    */
    <div className="w-full min-h-[calc(100vh-5rem)] animate-in fade-in duration-700">
      {children}
    </div>
  );
}
