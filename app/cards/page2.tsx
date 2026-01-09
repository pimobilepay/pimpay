import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import { 
  Plus, 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Settings2,
  AlertCircle,
  ArrowRight,
  History
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
      include: { 
        virtualCards: true // Correction : Nom exact du champ dans ton schéma User
      } 
    });
  } catch { return null; }
}

export default async function GlobalCardsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-sm w-full">
          <div className="bg-red-50 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Accès restreint</h2>
          <p className="text-gray-500 mt-2 text-sm">Veuillez vous connecter pour gérer vos cartes **pimpay**.</p>
        </div>
      </div>
    );
  }

  // On récupère la première carte si elle existe
  const card = user.virtualCards && user.virtualCards.length > 0 
    ? user.virtualCards[0] 
    : null;

  return (
    <div className="min-h-screen bg-[#F8F9FD] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Gestion des Cartes</h1>
            <p className="text-gray-500 mt-1">Configurez vos moyens de paiement virtuels.</p>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-2xl font-semibold border border-gray-200 hover:bg-gray-50 transition-all shadow-sm">
              <History size={18} />
              Transactions
            </button>
            {!card && (
              <button className="flex items-center gap-2 bg-[#6C5CE7] text-white px-5 py-2.5 rounded-2xl font-semibold hover:bg-[#5b4cc4] transition-all shadow-lg shadow-[#6C5CE7]/20">
                <Plus size={18} />
                Nouvelle Carte
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
            {card ? (
              <div className="space-y-8">
                <div className="relative group">
                   {/* On passe la carte directement */}
                   <VirtualCard card={card} user={user} />
                   <div className="absolute -bottom-4 right-4 bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-100 flex items-center gap-2 text-xs font-bold text-gray-700">
                     <div className={`w-2 h-2 rounded-full ${card.isFrozen ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                     {card.isFrozen ? 'CARTE GELÉE' : 'CARTE ACTIVE'}
                   </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Settings2 size={20} className="text-[#6C5CE7]" />
                    Contrôle de la carte
                  </h3>
                  <CardActions cardId={card.id} isFrozen={card.isFrozen} />
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-16 text-center">
                <div className="inline-flex p-6 bg-gray-50 rounded-3xl text-gray-400 mb-6">
                  <CreditCard size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Aucune carte disponible</h3>
                <p className="text-gray-500 max-w-sm mx-auto mt-3">Créez votre première carte virtuelle pimpay.</p>
                <button className="mt-8 text-[#6C5CE7] font-bold flex items-center gap-2 mx-auto">
                  En savoir plus <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#1a1a1a] text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-white/10 rounded-2xl text-green-400">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-xl font-bold">Sécurité Avancée</h3>
                </div>
                <p className="text-gray-400 leading-relaxed mb-6">
                  Vos fonds sont protégés. Plafond actuel : <strong>${card?.dailyLimit || 1000}</strong>.
                </p>
                <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Type</span>
                    <span className="text-xs bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest">{card?.type || 'CLASSIC'}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem]">
              <div className="flex gap-4">
                <AlertCircle className="text-blue-600 shrink-0" size={24} />
                <p className="text-blue-700 text-xs leading-relaxed">
                  Vérifiez toujours votre solde **PI** avant d'effectuer un achat avec votre carte virtuelle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
