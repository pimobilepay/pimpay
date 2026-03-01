import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import {
  ChevronLeft,
  ShieldCheck,
  Lock,
  PieChart,
  History,
  ArrowUpRight,
  CreditCard,
  Globe,
  Wallet,
  Copy,
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

    const card = await prisma.virtualCard.findFirst({
      where: {
        id: cardId,
        userId: payload.id as string,
      },
      include: {
        user: {
          include: {
            wallets: true,
          },
        },
      },
    });
    return card;
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
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <CreditCard size={28} className="text-white/30" />
          </div>
          <p className="text-white/40 font-bold text-sm">
            {"Carte introuvable ou acces refuse."}
          </p>
          <Link
            href="/cards"
            className="text-blue-400 text-xs mt-4 inline-block hover:text-blue-300 uppercase font-black tracking-widest transition-colors"
          >
            Retour aux cartes
          </Link>
        </div>
      </div>
    );
  }

  const wallets = card.user?.wallets || [];
  let usdBalance = 0;
  for (const w of wallets) {
    if (["USDT", "USD", "USDC", "DAI", "BUSD"].includes(w.currency)) {
      usdBalance += w.balance;
    }
  }
  const eurBalance = usdBalance * 0.92;
  const spentPercent = Math.min(
    ((card.totalSpent || 0) / (card.dailyLimit || 1000)) * 100,
    100
  );

  return (
    <div className="min-h-screen bg-[#030014] text-white pb-32 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[180px]"></div>
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[180px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="px-6 pt-8 pb-6 border-b border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <Link
                href="/cards"
                className="flex items-center gap-2 text-white/50 hover:text-blue-400 transition-all group"
              >
                <ChevronLeft
                  size={20}
                  className="group-hover:-translate-x-1 transition-transform"
                />
                <span className="font-bold text-xs uppercase tracking-tight">
                  Gestion des cartes
                </span>
              </Link>

              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${card.isFrozen ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`}
                ></div>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  {card.isFrozen ? "Carte gelee" : "Carte active"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Side: Card Visual + Actions */}
            <div className="space-y-6">
              <div className="relative group">
                <VirtualCard card={card} user={card.user} />

                {card.isFrozen && (
                  <div className="absolute inset-0 bg-[#030014]/90 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center border border-red-500/30">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                      <Lock className="text-red-500" size={28} />
                    </div>
                    <div className="bg-red-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {"Carte gelee"}
                    </div>
                  </div>
                )}
              </div>

              {/* Security & Control */}
              <div className="bg-white/[0.03] backdrop-blur-xl p-6 rounded-[24px] border border-white/10">
                <h3 className="text-[9px] font-black uppercase text-white/40 mb-5 px-1 tracking-[0.2em]">
                  {"Securite & Controle"}
                </h3>
                <CardActions cardId={card.id} isFrozen={card.isFrozen} />
              </div>

              {/* Balance */}
              <div className="bg-white/[0.03] backdrop-blur-xl p-6 rounded-[24px] border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Wallet size={18} className="text-blue-400" />
                  </div>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Solde carte
                  </span>
                </div>
                <p className="text-3xl font-black">
                  ${usdBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-sm text-white/40 ml-2">USD</span>
                </p>
                <p className="text-sm text-white/30 mt-1">
                  {"\u20AC"}{eurBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                </p>
              </div>
            </div>

            {/* Right Side: Card Info + Stats */}
            <div className="space-y-6">
              {/* Sensitive Card Data */}
              <div className="bg-white/[0.03] backdrop-blur-xl p-8 rounded-[24px] border border-white/10 relative overflow-hidden">
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl"></div>

                <div className="relative z-10 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[11px] font-black flex items-center gap-2 uppercase tracking-wider text-white/80">
                      <Lock size={14} className="text-blue-400" />
                      {"Donnees de la carte"}
                    </h3>
                    <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter italic">
                        PimPay Protected
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">
                        Titulaire
                      </span>
                      <span className="font-bold text-sm text-white/90 uppercase">
                        {card.holder}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">
                        {"Numero"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm tracking-[0.15em] text-blue-200">
                          {card.number.replace(/(\d{4})/g, "$1 ").trim()}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">
                        Expiration
                      </span>
                      <span className="font-mono text-sm text-blue-200">
                        {card.exp}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">
                        Code CVV
                      </span>
                      <span className="font-mono text-sm text-blue-200">
                        {card.cvv || "***"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">
                        Marque
                      </span>
                      <span className="font-bold text-sm text-white/80 uppercase">
                        {card.brand || "MASTERCARD"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">
                        Type
                      </span>
                      <span className="font-bold text-sm text-white/80 uppercase">
                        {card.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">
                        Devises
                      </span>
                      <div className="flex gap-2">
                        {(card.allowedCurrencies || ["USD", "EUR"]).map(
                          (cur: string) => (
                            <span
                              key={cur}
                              className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded"
                            >
                              {cur}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Flux */}
              <div className="bg-white/[0.03] backdrop-blur-xl p-8 rounded-[24px] border border-white/10">
                <div className="flex items-center gap-2 mb-6 text-white/80 font-black text-[11px] uppercase tracking-wider">
                  <PieChart size={16} className="text-blue-400" />
                  <span>Flux Mensuel</span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">
                      {"Depense"}
                    </p>
                    <p className="font-black text-xl">
                      ${(card.totalSpent || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all duration-1000"
                      style={{ width: `${spentPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <p className="text-[9px] font-bold text-white/30 uppercase">
                      {spentPercent.toFixed(0)}% utilise
                    </p>
                    <p className="text-[9px] font-black text-white/40 uppercase italic">
                      Limite: ${(card.dailyLimit || 1000).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[20px] hover:border-blue-500/30 transition-all">
                  <Globe size={18} className="text-blue-400 mb-3" />
                  <p className="text-xs font-bold text-white/80">
                    Paiements Globaux
                  </p>
                  <p className="text-[9px] text-white/40 mt-1">200+ pays</p>
                </div>
                <div className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[20px] hover:border-emerald-500/30 transition-all">
                  <ShieldCheck size={18} className="text-emerald-400 mb-3" />
                  <p className="text-xs font-bold text-white/80">
                    {"Securise"}
                  </p>
                  <p className="text-[9px] text-white/40 mt-1">
                    3DS + PimPay Shield
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="mt-10 bg-white/[0.03] backdrop-blur-xl p-8 rounded-[24px] border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[11px] font-black text-white/80 flex items-center gap-2 uppercase tracking-widest">
                <History size={16} className="text-blue-400" />
                Derniers Mouvements
              </h3>
              <Link
                href="/statements"
                className="text-blue-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-300 transition-colors"
              >
                Voir tout
              </Link>
            </div>

            <div className="flex items-center justify-center py-10 text-white/30">
              <div className="text-center">
                <History size={32} className="mx-auto mb-3 text-white/15" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  Aucune transaction
                </p>
                <p className="text-[10px] text-white/20 mt-1">
                  {"Les transactions apparaitront ici"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
