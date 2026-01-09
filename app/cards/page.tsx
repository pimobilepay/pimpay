import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import Link from "next/link";
import {
  Plus,
  ShieldCheck,
  CreditCard,
  Settings2,
  AlertCircle,
  History,
  CheckCircle2,
  ExternalLink,
  CircleDot,
  Zap
} from "lucide-react";
import VirtualCard from "@/components/cards/VirtualCard";
import CardActions from "@/components/cards/CardActions";

async function getAuthenticatedUser() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return await prisma.user.findUnique({
      where: { id: payload.id as string },
      include: { virtualCards: { orderBy: { createdAt: 'desc' } } }
    });
  } catch { return null; }
}

export default async function GlobalCardsPage({ searchParams }: { searchParams: { id?: string } }) {
  const user = await getAuthenticatedUser();

  if (!user) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-500 font-bold">Accès restreint à pimpay.</div>;

  const cards = user.virtualCards || [];
  const selectedCardsId = searchParams.id || (cards.length > 0 ? cards[0].id : null);
  const activeCard = cards.find(c => c.id === selectedCardsId) || cards[0];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans selection:bg-blue-500/30">
      
      {/* HEADER - Style Historique */}
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase">Mes Cartes</h1>
              <div className="flex items-center gap-2 mt-1">
                <CircleDot size={10} className="text-blue-500 animate-pulse" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Virtual Asset Manager</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/statements" className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
              <History size={20} />
            </Link>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:scale-105 transition-all active:scale-95 border border-blue-500/50">
              <Plus size={18} />
              Nouvelle Carte
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Section Gauche : Liste des cartes - Style Item Historique */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] px-2">Vos Cartes ({cards.length})</h3>
            <div className="flex lg:flex-col gap-4 overflow-x-auto pb-4 lg:pb-0 no-scrollbar">
              {cards.map((c) => (
                <a
                  href={`?id=${c.id}`}
                  key={c.id}
                  className={`flex-shrink-0 w-[280px] lg:w-full p-6 rounded-[2rem] border transition-all cursor-pointer ${
                    activeCard?.id === c.id
                    ? 'border-blue-500/50 bg-blue-600/10 shadow-lg shadow-blue-500/5'
                    : 'border-white/5 bg-slate-900/40 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${activeCard?.id === c.id ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-500 border border-white/5'}`}>
                      <CreditCard size={20} />
                    </div>
                    {activeCard?.id === c.id && <CheckCircle2 size={18} className="text-blue-500" />}
                  </div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Pimpay {c.brand}</p>
                  <p className="text-xl font-mono font-bold text-white mt-1 tracking-tighter">•••• {c.number.slice(-4)}</p>
                </a>
              ))}
            </div>
          </div>

          {/* Section Droite : Focus Style Statement */}
          <div className="lg:col-span-8 space-y-8">
            {activeCard ? (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                  {/* Carte Virtuelle */}
                  <div className="relative group perspective-1000">
                    <VirtualCard card={activeCard} user={user} />
                    {activeCard.isFrozen && (
                       <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] rounded-[2.5rem] flex items-center justify-center pointer-events-none">
                          <div className="bg-red-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border border-red-400">GELÉE</div>
                       </div>
                    )}
                    <Link
                      href={`/cards/${activeCard.id}`}
                      className="absolute top-4 right-4 p-3 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-2xl text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                    >
                      <ExternalLink size={18} />
                    </Link>
                  </div>

                  {/* Stats - Style StatMiniCard */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 text-blue-400 mb-4">
                          <Zap size={16} />
                          <span className="text-[9px] font-black uppercase tracking-widest">Limite de crédit</span>
                        </div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-tighter">Solde Utilisé</p>
                        <h2 className="text-4xl font-black text-white mt-1 tracking-tighter">${activeCard.totalSpent.toLocaleString()}</h2>
                        <div className="w-full bg-white/5 h-1.5 rounded-full mt-6 overflow-hidden border border-white/5">
                          <div
                            className="bg-blue-600 h-full rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                            style={{ width: `${Math.min((activeCard.totalSpent / activeCard.dailyLimit) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="mt-3 text-[10px] text-slate-500 font-bold uppercase">Capacité max: ${activeCard.dailyLimit}</p>
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-[2rem] flex gap-4 items-center">
                      <AlertCircle className="text-amber-500 shrink-0" size={20} />
                      <p className="text-[10px] text-amber-200 font-bold leading-relaxed uppercase tracking-tight">
                        Cette carte est connectée à votre Ledger **PI**. Toutes les transactions sont vérifiées.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions - Style Section Timelines */}
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] shadow-sm">
                  <div className="flex justify-between items-center mb-10 px-2">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-500 border border-blue-500/20">
                        <Settings2 size={20} />
                      </div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tighter">Paramètres de sécurité</h3>
                    </div>
                    <Link href={`/cards/${activeCard.id}`} className="text-blue-500 text-[10px] font-black uppercase tracking-widest hover:text-blue-400 transition-colors">
                      View full details
                    </Link>
                  </div>
                  <CardActions cardId={activeCard.id} isFrozen={activeCard.isFrozen} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 bg-slate-900/20 rounded-[3rem] border border-dashed border-white/5">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-slate-700 mb-6 border border-white/5">
                  <Plus size={40} />
                </div>
                <h2 className="text-xl font-black text-white uppercase">No Active Card</h2>
                <p className="text-slate-500 text-center max-w-xs mt-3 text-sm font-medium">Démarrez votre expérience Web3 en créant une carte virtuelle.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
