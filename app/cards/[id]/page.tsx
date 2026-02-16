import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import {
  ChevronLeft,
  ShieldCheck,
  Copy,
  Eye,
  Download,
  PieChart,
  Calendar,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  History // L'icône est maintenant bien importée
} from "lucide-react";
import Link from "next/link";
import VirtualCard from "@/components/cards/VirtualCard";
import CardActions from "@/components/cards/CardActions";

async function getCardDetails(cardId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    return await prisma.virtualCard.findFirst({
      where: {
        id: cardId,
        userId: payload.id as string,
      },
      include: { user: true },
    });
  } catch {
    return null;
  }
}

export default async function CardDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const card = await getCardDetails(resolvedParams.id);

  if (!card) {
    return (
      <div className="min-h-screen bg-[#FBFBFF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 font-bold">Carte introuvable ou accès refusé.</p>
          <Link href="/dashboard" className="text-[#6C5CE7] text-sm mt-4 inline-block hover:underline uppercase font-black tracking-widest">
            Retour
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFF] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation */}
        <Link href="/cards" className="flex items-center gap-2 text-gray-500 hover:text-[#6C5CE7] transition-all mb-8 group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-xs uppercase tracking-tight">Gestion des cartes</span>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          
          {/* CÔTÉ GAUCHE : VISUEL ET ACTIONS */}
          <div className="space-y-8">
            <div className="relative group">
              <VirtualCard card={card} user={card.user} />
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-[9px] font-black uppercase text-gray-400 mb-6 px-2 tracking-[0.2em]">
                Sécurité & Contrôle
              </h3>
              <CardActions cardId={card.id} isFrozen={card.isFrozen} />
            </div>
          </div>

          {/* CÔTÉ DROIT : INFOS SENSIBLES */}
          <div className="space-y-6">
            
            <div className="bg-[#0f172a] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/5">
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-black flex items-center gap-2 uppercase tracking-wider">
                    <Lock size={14} className="text-blue-500" />
                    Données de la carte
                  </h3>
                  <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter italic">Pimpay Protected</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Numéro</span>
                    <span className="font-mono text-sm tracking-[0.15em] text-blue-100">{card.number}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Expiration</span>
                    <span className="font-mono text-sm text-blue-100">{card.exp}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Code CVV</span>
                    <span className="font-mono text-sm text-blue-100">{card.cvv || '***'}</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl" />
            </div>

            {/* Analyses */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6 text-gray-900 font-black text-[11px] uppercase tracking-wider">
                <PieChart size={16} className="text-blue-600" />
                <span>Flux Mensuel</span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Dépensé</p>
                  <p className="font-black text-xl text-slate-900">${card.totalSpent}</p>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((card.totalSpent / card.dailyLimit) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[9px] font-black text-slate-400 text-right uppercase italic">
                  Limite: ${card.dailyLimit}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Historique */}
        <div className="mt-12 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[11px] font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">
              <History size={16} className="text-blue-600" />
              Derniers Mouvements
            </h3>
            <button className="text-blue-600 text-[9px] font-black uppercase tracking-widest hover:underline">
              Exporter CSV
            </button>
          </div>

          <div className="space-y-6 opacity-60">
             <div className="flex justify-between items-center py-2 border-b border-slate-50 border-dashed">
                <div className="flex gap-4 items-center">
                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                      <ArrowUpRight size={18} />
                   </div>
                   <div>
                      <p className="font-black text-[11px] text-slate-900 uppercase tracking-tight">Exemple Transaction</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">En attente de données réelles...</p>
                   </div>
                </div>
                <p className="font-black text-xs text-slate-900">-$0.00</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
