import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
// AJOUT DE L'IMPORT ICI
import { AdminControlPanel } from "@/components/admin/AdminControlPanel";

export default async function AdminUserPage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { wallets: true }
  });

  if (!user) notFound();

  return (
    <div className="min-h-screen bg-[#020617] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            PROFIL<span className="text-blue-500">ADMIN</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">
            ID: {user.id}
          </p>
        </div>

        {/* Le composant que nous avons corrigé ensemble */}
        <AdminControlPanel
          userId={user.id}
          userName={user.name || user.username || "Utilisateur"}
          userEmail={user.email || "Pas d'email"}
          currentRole={user.role}
        />

        {/* Tu peux ajouter ici une vue rapide du solde pour vérification */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {user.wallets.map((wallet) => (
            <div key={wallet.id} className="bg-slate-900/40 border border-white/5 p-4 rounded-3xl">
              <p className="text-[10px] font-black text-slate-500 uppercase">{wallet.currency}</p>
              <p className="text-xl font-black text-white">
                {wallet.currency === "PI" ? "π" : "$"} {wallet.balance.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
