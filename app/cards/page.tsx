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
  Zap,
  TrendingUp,
  Fingerprint,
  Lock,
  Eye,
  ArrowUpRight
} from "lucide-react";
import VirtualCard from "@/components/cards/VirtualCard";
import CardActions from "@/components/cards/CardActions";

// Fonction d'authentification sécurisée
async function getAuthenticatedUser() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return await prisma.user.findUnique({
      where: { id: payload.id as string },
      include: { 
        virtualCards: { orderBy: { createdAt: 'desc' } },
        // On inclut le profil pour vérifier le statut KYC
      }
    });
  } catch { return null; }
}

export default async function GlobalCardsPage({ searchParams }: { searchParams: { id?: string } }) {
  const user = await getAuthenticatedUser();

  if (!user) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-slate-500 font-bold gap-4">
      <Lock size={40} className="text-blue-600 animate-pulse" />
      <p className="uppercase tracking-widest text-xs">Accès restreint à PimPay.</p>
    </div>
  );

  const cards = user.virtualCards || [];
  const selectedCardsId = searchParams.id || (cards.length > 0 ? cards[0].id : null);
  const activeCard = cards.find(c => c.id === selectedCardsId) || cards[0];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans selection:bg-blue-500/30">

      {/* HEADER - Style Historique avec Effet Néon */}
      <div className="px-6 pt-12 pb-10 bg-gradient-to-b from-blue-600/15 via-[#020617]/5 to-transparent border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-blue-500 rounded-full blur opacity-20 animate-pulse"></div>
              <h1 className="relative text-5xl font-black tracking-tighter text-white uppercase italic">
                Pim<span className="text-blue-500">Cards</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[3px]">System Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-4">
              <span className="text-[9px] font-black text-slate-500 uppercase">Statut Réseau</span>
              <span className="text-xs font-bold text-white uppercase tracking-tighter">Mainnet Pi Connected</span>
            </div>
            <Link href="/statements" className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <History size={20} />
            </Link>
            <button className="group flex items-center gap-3 bg-blue-600 text-white px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95 border border-blue-400/30">
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              Émettre une carte
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Section Gauche : Liste des cartes - Améliorée */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px]">Portefeuille ({cards.length})</h3>
              <div className="text-[9px] font-black text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full bg-blue-500/5 uppercase">GCV Standard</div>
            </div>
            
            <div className="flex lg:flex-col gap-4 overflow-x-auto pb-4 lg:pb-0 no-scrollbar">
              {cards.map((c) => (
                <Link
                  href={`?id=${c.id}`}
                  key={c.id}
                  className={`flex-shrink-0 w-[280px] lg:w-full p-6 rounded-[2.5rem] border transition-all duration-300 group relative overflow-hidden ${
                    activeCard?.id === c.id
                    ? 'border-blue-500/40 bg-blue-600/10 shadow-2xl shadow-blue-500/10'
                    : 'border-white/5 bg-slate-900/40 hover:border-white/20'
                  }`}
                >
                  {activeCard?.id === c.id && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />}
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-2xl transition-colors ${activeCard?.id === c.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-950 text-slate-500 border border-white/5'}`}>
                      <CreditCard size={22} />
                    </div>
                    <div className="flex flex-col items-end">
                       <p className="text-[9px] font-black text-slate-600 uppercase">Solde</p>
                       <p className={`text-sm font-bold ${activeCard?.id === c.id ? 'text-white' : 'text-slate-400'}`}>$12,450.00</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-60">Card Member</p>
                    <p className="text-xl font-mono font-bold text-white mt-1 tracking-wider">•••• {c.number.slice(-4)}</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* FEATURE UTILE : Rapport de sécurité rapide */}
            <div className="hidden lg:block p-6 rounded-[2.5rem] border border-emerald-500/10 bg-emerald-500/5">
               <div className="flex items-center gap-3 mb-3">
                 <ShieldCheck size={18} className="text-emerald-500" />
                 <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">PimPay Protection</span>
               </div>
               <p className="text-[10px] text-emerald-200/60 leading-relaxed font-medium uppercase">
                 Analyse biométrique active. Aucune tentative de fraude détectée sur vos actifs ces dernières 24h.
               </p>
            </div>
          </div>

          {/* Section Droite : Focus Style Statement */}
          <div className="lg:col-span-8 space-y-8">
            {activeCard ? (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
                  {/* Carte Virtuelle Interactive */}
                  <div className="relative group perspective-1000">
                    <VirtualCard card={activeCard} user={user} />
                    {activeCard.isFrozen && (
                       <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center pointer-events-none border border-red-500/30">
                          <Lock className="text-red-500 mb-2" size={32} />
                          <div className="bg-red-500 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">CARTE GELÉE</div>
                       </div>
                    )}
                    <Link
                      href={`/cards/${activeCard.id}`}
                      className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-blue-600 border border-white/10 backdrop-blur-md rounded-2xl text-white transition-all opacity-0 group-hover:opacity-100 shadow-2xl scale-90 group-hover:scale-100"
                    >
                      <Eye size={20} />
                    </Link>
                  </div>

                  {/* Stats & Dashboard - Style Nouveau */}
                  <div className="flex flex-col gap-6">
                    <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-900/10 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-blue-500/20 transition-all">
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                         <TrendingUp size={80} className="text-blue-500" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 text-blue-400 mb-6">
                          <Zap size={16} />
                          <span className="text-[9px] font-black uppercase tracking-[3px]">Credit Metrics</span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Utilisation Mensuelle</p>
                        <div className="flex items-baseline gap-2">
                          <h2 className="text-5xl font-black text-white mt-1 tracking-tighter">${activeCard.totalSpent.toLocaleString()}</h2>
                          <span className="text-emerald-500 text-[10px] font-bold">+2.4%</span>
                        </div>
                        
                        <div className="w-full bg-white/5 h-2 rounded-full mt-8 overflow-hidden border border-white/5">
                          <div
                            className="bg-blue-600 h-full rounded-full shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min((activeCard.totalSpent / activeCard.dailyLimit) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-4">
                           <p className="text-[10px] text-slate-500 font-bold uppercase">Limite: ${activeCard.dailyLimit}</p>
                           <p className="text-[10px] text-blue-500 font-black uppercase">Standard Tier</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-[2rem] flex gap-4 items-center">
                      <div className="p-3 bg-amber-500/10 rounded-xl">
                        <Fingerprint className="text-amber-500" size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-amber-200 font-black uppercase tracking-tight">Ledger PI Validation</p>
                        <p className="text-[9px] text-amber-500/70 font-bold uppercase leading-tight">
                          Synchronisé avec le Mainnet. Transactions irréversibles via protocole GCV.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sécurité & Contrôles - Style Timelines */}
                <div className="bg-[#020617] border border-white/5 p-8 rounded-[3rem] shadow-sm relative">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-blue-600 rounded-[1.5rem] text-white shadow-lg shadow-blue-600/20">
                        <Settings2 size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Security Vault</h3>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Contrôle granulaire des actifs</p>
                      </div>
                    </div>
                    <Link href={`/cards/${activeCard.id}`} className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-[2px] hover:text-white transition-all bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                      Détails complets <ArrowUpRight size={14} />
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-1 bg-white/5 rounded-[2rem]">
                        <CardActions cardId={activeCard.id} isFrozen={activeCard.isFrozen} />
                     </div>
                     {/* FEATURE UTILE : Quick Settings Toggle simulation */}
                     <div className="p-6 border border-white/5 rounded-[2rem] bg-slate-900/20 flex flex-col justify-between">
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-slate-400">Paiement Sans Contact</span>
                              <div className="w-10 h-5 bg-blue-600 rounded-full flex items-center px-1"><div className="w-3.5 h-3.5 bg-white rounded-full ml-auto"/></div>
                           </div>
                           <div className="flex justify-between items-center opacity-50">
                              <span className="text-[10px] font-black uppercase text-slate-400">Achats Internationaux</span>
                              <div className="w-10 h-5 bg-slate-700 rounded-full flex items-center px-1"><div className="w-3.5 h-3.5 bg-white rounded-full"/></div>
                           </div>
                        </div>
                        <p className="text-[9px] text-slate-600 italic mt-4">* Paramètres modifiables instantanément</p>
                     </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 bg-slate-900/20 rounded-[4rem] border border-dashed border-white/10">
                <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500 mb-8 border border-blue-500/20 animate-bounce">
                  <Plus size={40} />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Aucune carte active</h2>
                <p className="text-slate-500 text-center max-w-xs mt-4 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Démarrez votre expérience <span className="text-blue-500">PimPay</span> en créant votre première carte virtuelle sécurisée.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
