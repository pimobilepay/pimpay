export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#020617] relative">
      {/* Le SDK Pi est charge dans le Root Layout (beforeInteractive)
          et initialise par PiInitializer.tsx - pas de doublon ici */}

      {/* Contenu des pages login/signup */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Effet visuel PimPay */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.1),transparent)] pointer-events-none" />
    </div>
  );
}
