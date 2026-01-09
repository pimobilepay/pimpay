import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import Link from "next/link"; // Ajout de Link pour la navigation
import { 
  Plus, 
  ShieldCheck, 
  CreditCard, 
  Settings2,
  AlertCircle,
  History,
  CheckCircle2,
  ExternalLink // Nouvelle icône pour les détails
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

  if (!user) return <div className="p-20 text-center font-bold text-gray-400">Accès restreint à pimpay.</div>;

  const cards = user.virtualCards || [];
  const selectedCardsId = searchParams.id || (cards.length > 0 ? cards[0].id : null);
  const activeCard = cards.find(c => c.id === selectedCardsId) || cards[0];

  return (
    <div className="min-h-screen bg-[#FBFBFF] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Style Web3 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Cartes <span className="text-[#6C5CE7]">Virtuelles</span></h1>
            <p className="text-gray-500 font-medium mt-2">Gérez vos actifs Web3 et vos paiements fiat en toute fluidité.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-gray-600">
              <History size={22} />
            </button>
            <button className="flex items-center gap-2 bg-[#6C5CE7] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-[#6C5CE7]/30 hover:scale-105 transition-all active:scale-95">
              <Plus size={20} />
              Commander une carte
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Section Gauche : Liste des cartes */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 px-2">Vos Cartes ({cards.length})</h3>
            <div className="flex lg:flex-col gap-4 overflow-x-auto pb-4 lg:pb-0">
              {cards.map((c) => (
                <a 
                  href={`?id=${c.id}`}
                  key={c.id} 
                  className={`flex-shrink-0 w-[280px] lg:w-full p-5 rounded-[2rem] border-2 transition-all cursor-pointer ${
                    activeCard?.id === c.id 
                    ? 'border-[#6C5CE7] bg-white shadow-xl shadow-[#6C5CE7]/5 scale-[1.02]' 
                    : 'border-transparent bg-gray-50 hover:bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-xl ${activeCard?.id === c.id ? 'bg-[#6C5CE7] text-white' : 'bg-gray-200 text-gray-400'}`}>
                      <CreditCard size={18} />
                    </div>
                    {activeCard?.id === c.id && <CheckCircle2 size={18} className="text-[#6C5CE7]" />}
                  </div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Pimpay {c.brand}</p>
                  <p className="font-mono font-bold text-gray-900 mt-1">•••• {c.number.slice(-4)}</p>
                </a>
              ))}
            </div>
          </div>

          {/* Section Droite : Focus sur la carte sélectionnée */}
          <div className="lg:col-span-8 space-y-8">
            {activeCard ? (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                  {/* Design de la carte avec Lien vers Détails */}
                  <div className="relative group perspective-1000">
                    <VirtualCard card={activeCard} user={user} />
                    
                    {/* Badge État Gelé */}
                    {activeCard.isFrozen && (
                       <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] rounded-[2.5rem] flex items-center justify-center pointer-events-none">
                          <div className="bg-red-500 text-white px-4 py-1 rounded-full text-xs font-black tracking-widest shadow-xl">GELÉE</div>
                       </div>
                    )}

                    {/* Bouton vers page détails superposé */}
                    <Link 
                      href={`/cards/${activeCard.id}`}
                      className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                    >
                      <ExternalLink size={18} />
                    </Link>
                  </div>

                  {/* Détails rapides & Stats */}
                  <div className="space-y-4">
                    <div className="bg-[#1a1a1a] p-6 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                      <div className="relative z-10">
                        <p className="text-gray-500 text-[10px] font-black uppercase">Solde Utilisé (Mensuel)</p>
                        <h2 className="text-3xl font-black mt-1">${activeCard.totalSpent.toLocaleString()} <span className="text-sm text-gray-500 font-normal">/ ${activeCard.dailyLimit}</span></h2>
                        <div className="w-full bg-white/10 h-1.5 rounded-full mt-4 overflow-hidden">
                          <div 
                            className="bg-[#6C5CE7] h-full rounded-full shadow-[0_0_10px_#6C5CE7]" 
                            style={{ width: `${Math.min((activeCard.totalSpent / activeCard.dailyLimit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#6C5CE7] opacity-20 rounded-full blur-2xl" />
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 items-center">
                      <AlertCircle className="text-amber-600" size={18} />
                      <p className="text-[10px] text-amber-800 font-bold leading-tight uppercase">Utilisez cette carte pour vos paiements Pi Network & Visa.</p>
                    </div>
                  </div>
                </div>

                {/* Actions de gestion : inclut le bouton GELER */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#6C5CE7]/10 rounded-xl text-[#6C5CE7]">
                        <Settings2 size={20} />
                      </div>
                      <h3 className="text-lg font-black text-gray-900">Paramètres de sécurité</h3>
                    </div>
                    {/* Lien secondaire vers les détails */}
                    <Link href={`/cards/${activeCard.id}`} className="text-[#6C5CE7] text-xs font-bold hover:underline">
                      Voir tous les détails
                    </Link>
                  </div>
                  <CardActions cardId={activeCard.id} isFrozen={activeCard.isFrozen} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
                  <Plus size={40} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Prêt pour votre carte ?</h2>
                <p className="text-gray-500 text-center max-w-xs mt-2">Activez votre puissance de paiement Web3 en créant une carte virtuelle.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
