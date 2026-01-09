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
  ArrowDownLeft
} from "lucide-react";
import Link from "next/link";
import VirtualCard from "@/components/cards/VirtualCard";
import CardActions from "@/components/cards/CardActions";

async function getCardDetails(cardId: string) {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    
    return await prisma.virtualCard.findFirst({
      where: { 
        id: cardId,
        userId: payload.id as string // Sécurité : vérifier que la carte appartient à l'user
      },
      include: { user: true }
    });
  } catch { return null; }
}

export default async function CardDetailsPage({ params }: { params: { id: string } }) {
  const card = await getCardDetails(params.id);

  if (!card) return <div className="p-20 text-center text-gray-400">Carte introuvable ou accès refusé.</div>;

  return (
    <div className="min-h-screen bg-[#FBFBFF] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation / Retour */}
        <Link href="/cards" className="flex items-center gap-2 text-gray-500 hover:text-[#6C5CE7] transition-all mb-8 group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold">Retour aux cartes</span>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          
          {/* CÔTÉ GAUCHE : VISUEL ET ACTIONS */}
          <div className="space-y-8">
            <div className="relative group">
               <VirtualCard card={card} user={card.user} />
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <h3 className="text-sm font-black uppercase text-gray-400 mb-6 px-2 tracking-widest">Contrôle Rapide</h3>
               <CardActions cardId={card.id} isFrozen={card.isFrozen} />
            </div>
          </div>

          {/* CÔTÉ DROIT : INFOS SENSIBLES & LIMITES */}
          <div className="space-y-6">
            
            {/* Boîte Infos Sensibles */}
            <div className="bg-[#1a1a1a] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
               <div className="relative z-10 space-y-6">
                  <div className="flex justify-between items-center">
                     <h3 className="font-bold flex items-center gap-2">
                        <Lock size={16} className="text-[#6C5CE7]" /> 
                        Détails de paiement
                     </h3>
                     <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-xs text-gray-400">
                        Tout copier
                     </button>
                  </div>

                  <div className="space-y-4">
                     <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-500 text-xs">Numéro de carte</span>
                        <span className="font-mono text-sm tracking-widest">{card.number}</span>
                     </div>
                     <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-500 text-xs">Date d'expiration</span>
                        <span className="font-mono text-sm">{card.exp}</span>
                     </div>
                     <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-500 text-xs">Code CVV</span>
                        <span className="font-mono text-sm">{card.cvv || '***'}</span>
                     </div>
                  </div>
               </div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C5CE7] opacity-10 rounded-full blur-3xl" />
            </div>

            {/* Statistiques d'utilisation */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6 text-gray-900 font-bold">
                   <PieChart size={18} className="text-[#6C5CE7]" />
                   <span>Analyses</span>
                </div>
                
                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <p className="text-xs text-gray-400 font-medium">Dépensé ce mois</p>
                      <p className="font-black text-xl text-gray-900">${card.totalSpent}</p>
                   </div>
                   <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#6C5CE7] to-[#a29bfe] h-full" 
                        style={{ width: `${(card.totalSpent / card.dailyLimit) * 100}%` }}
                      />
                   </div>
                   <p className="text-[10px] text-gray-400 text-right">Limite quotidienne : ${card.dailyLimit}</p>
                </div>
            </div>

          </div>
        </div>

        {/* Transactions de cette carte spécifique */}
        <div className="mt-12 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                 <History size={20} className="text-[#6C5CE7]" />
                 Activité Récente
              </h3>
              <button className="text-[#6C5CE7] text-xs font-bold hover:underline">Voir tout</button>
           </div>
           
           <div className="space-y-6">
              {/* Exemple de transaction (à mapper avec tes données réelles) */}
              <div className="flex justify-between items-center">
                 <div className="flex gap-4 items-center">
                    <div className="p-3 bg-gray-50 rounded-2xl text-red-500">
                       <ArrowUpRight size={20} />
                    </div>
                    <div>
                       <p className="font-bold text-sm">Netflix Subscription</p>
                       <p className="text-[10px] text-gray-400 uppercase font-medium">Card Payment • 12 Jan 2026</p>
                    </div>
                 </div>
                 <p className="font-bold text-sm text-gray-900">-$15.99</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
