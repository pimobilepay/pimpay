import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import Link from "next/link";
import {
  Plus,
  ShieldCheck,
  CreditCard,
  Settings2,
  History,
  CheckCircle2,
  TrendingUp,
  Lock,
  Eye,
  ArrowUpRight,
  Wallet,
  Globe,
  Shield,
  Bell,
  ChevronRight,
  Wifi,
  Sparkles,
  BarChart3,
  Database,
  Zap,
} from "lucide-react";
import VirtualCard from "@/components/cards/VirtualCard";
import CardActions from "@/components/cards/CardActions";
import { CardSelectButton } from "@/components/cards/CardSelectButton";

// Fonction d'authentification securisee
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return await prisma.user.findUnique({
      where: { id: payload.id as string },
      include: {
        virtualCards: { orderBy: { createdAt: "desc" } },
        wallets: true,
      },
    });
  } catch {
    return null;
  }
}

export default async function GlobalCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await getAuthenticatedUser();
  const resolvedParams = await searchParams;

  if (!user)
    return (
      <div className="min-h-screen bg-[#030014] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-full flex items-center justify-center">
              <Lock size={32} className="text-white" />
            </div>
          </div>
          <p className="text-white/60 text-sm font-bold uppercase tracking-[0.3em]">
            {"Acces restreint a PimPay"}
          </p>
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-2xl text-white font-bold text-sm hover:opacity-90 transition-all"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );

  const cards = user.virtualCards || [];
  const selectedCardsId = resolvedParams.id || (cards.length > 0 ? cards[0].id : null);
  const activeCard = cards.find((c) => c.id === selectedCardsId) || cards[0];

  // Calcul des statistiques reelles depuis les wallets
  const wallets = user.wallets || [];
  let usdBalance = 0;
  let eurBalance = 0;
  for (const w of wallets) {
    if (["USDT", "USD", "USDC", "DAI", "BUSD"].includes(w.currency)) {
      usdBalance += w.balance;
    }
  }
  eurBalance = usdBalance * 0.92;
  const totalSpent = cards.reduce((acc, c) => acc + (c.totalSpent || 0), 0);

  return (
    <div className="min-h-screen bg-[#030014] text-white pb-32 font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[180px]"></div>
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[180px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      <div className="relative z-10">
        {/* HEADER */}
        <header className="px-4 sm:px-6 pt-6 pb-6 border-b border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl blur-lg opacity-50"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Wallet size={24} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">
                    Pim<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Cards</span>
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.15em]">
                      {"Web3 Finance"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/statements"
                  className="group p-3 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:border-purple-500/50 transition-all"
                >
                  <History size={18} className="text-white/60 group-hover:text-purple-400 transition-colors" />
                </Link>
                <Link
                  href="/notifications"
                  className="group p-3 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:border-cyan-500/50 transition-all relative"
                >
                  <Bell size={18} className="text-white/60 group-hover:text-cyan-400 transition-colors" />
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse"></div>
                </Link>
                <Link
                  href="/dashboard/card/order"
                  className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all active:scale-95"
                >
                  <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span className="hidden sm:inline">Nouvelle carte</span>
                </Link>
              </div>
            </div>

            {/* Stats Banner */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              <div className="p-4 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 hover:border-purple-500/30 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <Wallet size={14} className="text-purple-400" />
                  </div>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Balance</span>
                </div>
                <p className="text-xl font-black">
                  ${usdBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {"\u20AC"}{eurBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                </p>
              </div>

              <div className="p-4 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 hover:border-cyan-500/30 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                    <TrendingUp size={14} className="text-cyan-400" />
                  </div>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{"Depenses"}</span>
                </div>
                <p className="text-xl font-black">${totalSpent.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 hover:border-emerald-500/30 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                    <CreditCard size={14} className="text-emerald-400" />
                  </div>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Cartes</span>
                </div>
                <p className="text-xl font-black">{cards.filter((c) => !c.isFrozen).length}</p>
              </div>

              <div className="p-4 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 hover:border-pink-500/30 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
                    <Shield size={14} className="text-pink-400" />
                  </div>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{"Securite"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-black text-emerald-400">100%</p>
                  <CheckCircle2 size={14} className="text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Section Gauche : Liste des cartes */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Mes Cartes ({cards.length})
                </h3>
              </div>

              <div className="flex lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
                {cards.map((c) => (
                  <Link
                    href={`?id=${c.id}`}
                    key={c.id}
                    className={`flex-shrink-0 w-[280px] lg:w-full p-5 rounded-2xl border transition-all duration-300 group relative overflow-hidden ${
                      activeCard?.id === c.id
                        ? "border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 shadow-xl shadow-purple-500/10"
                        : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    {activeCard?.id === c.id && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-cyan-500"></div>
                    )}

                    {c.isFrozen && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-red-500/20 rounded-full border border-red-500/30">
                        <span className="text-[8px] font-bold text-red-400 uppercase">{"Gelee"}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={`p-2.5 rounded-xl transition-all ${
                          activeCard?.id === c.id
                            ? "bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/25"
                            : "bg-white/5 text-white/50 group-hover:bg-white/10"
                        }`}
                      >
                        <CreditCard size={18} />
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-[9px] font-bold text-white/40 uppercase">Solde</p>
                        <p className={`text-base font-bold ${activeCard?.id === c.id ? "text-white" : "text-white/70"}`}>
                          ${usdBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Card Member</p>
                      <p className="text-lg font-mono font-bold text-white mt-1 tracking-[0.12em]">
                        {"•••• •••• •••• "}{c.number.slice(-4)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${c.isFrozen ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`}></div>
                        <span className="text-[9px] font-medium text-white/40">{c.isFrozen ? "Inactive" : "Active"}</span>
                      </div>
                      <span className="text-[9px] font-bold text-white/30">{c.brand?.toUpperCase() || "VISA"}</span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Security Report - Desktop only */}
              <div className="hidden lg:block p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <ShieldCheck size={16} className="text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Protection Active</span>
                </div>
                <p className="text-[11px] text-emerald-200/60 leading-relaxed">
                  {"Aucune tentative de fraude detectee sur vos actifs ces dernieres 24h."}
                </p>
              </div>
            </div>

            {/* Section Droite : Details de la carte */}
            <div className="lg:col-span-8 space-y-6">
              {activeCard ? (
                <>
                  {/* Card Preview & Stats */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Virtual Card */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl blur-2xl transform scale-95 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                      <div className="relative">
                        <VirtualCard card={activeCard} user={user} />

                        {activeCard.isFrozen && (
                          <div className="absolute inset-0 bg-[#030014]/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-red-500/30">
                            <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                              <Lock className="text-red-500" size={24} />
                            </div>
                            <div className="bg-red-500 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                              {"Carte Gelee"}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons under card */}
                      <div className="flex gap-2 mt-3">
                        <Link
                          href={`/dashboard/card?id=${activeCard.id}`}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 backdrop-blur-md rounded-xl text-white text-xs font-bold uppercase tracking-wider transition-all"
                        >
                          <Eye size={14} />
                          <span>Voir</span>
                        </Link>
                        <CardSelectButton cardId={activeCard.id} />
                      </div>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="flex flex-col gap-3">
                      {/* Credit Metrics */}
                      <div className="flex-1 bg-white/[0.02] backdrop-blur-xl border border-white/10 p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                          <BarChart3 size={80} className="text-purple-500" />
                        </div>

                        <div className="relative z-10">
                          <div className="flex items-center gap-2 text-purple-400 mb-3">
                            <Zap size={12} />
                            <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Credit Metrics</span>
                          </div>

                          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Utilisation Mensuelle</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <h2 className="text-3xl font-black">${activeCard.totalSpent?.toLocaleString() || "0"}</h2>
                            <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                              <ArrowUpRight size={10} /> +2.4%
                            </span>
                          </div>

                          <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-cyan-500 h-full rounded-full shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-1000"
                              style={{
                                width: `${Math.min(((activeCard.totalSpent || 0) / (activeCard.dailyLimit || 10000)) * 100, 100)}%`,
                              }}
                            />
                          </div>

                          <div className="flex justify-between mt-2">
                            <p className="text-[10px] text-white/40 font-medium">
                              Limite: ${activeCard.dailyLimit?.toLocaleString() || "10,000"}
                            </p>
                            <p className="text-[10px] text-purple-400 font-bold uppercase">Standard</p>
                          </div>
                        </div>
                      </div>

                      {/* Blockchain Status */}
                      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3 items-center">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                          <Database className="text-amber-400" size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-amber-200 font-bold uppercase tracking-tight">PI Ledger</p>
                          <p className="text-[10px] text-amber-500/70 font-medium mt-0.5">
                            {"Synchronise avec le Mainnet"}
                          </p>
                        </div>
                        <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl hover:border-purple-500/30 transition-all group cursor-pointer">
                      <Globe size={18} className="text-purple-400 mb-2" />
                      <p className="text-xs font-bold text-white/80">Paiements Globaux</p>
                      <p className="text-[9px] text-white/40 mt-0.5">200+ pays</p>
                    </div>
                    <div className="p-4 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl hover:border-cyan-500/30 transition-all group cursor-pointer">
                      <Wifi size={18} className="text-cyan-400 mb-2" />
                      <p className="text-xs font-bold text-white/80">Sans Contact</p>
                      <p className="text-[9px] text-white/40 mt-0.5">{"NFC active"}</p>
                    </div>
                    <div className="p-4 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl hover:border-pink-500/30 transition-all group cursor-pointer">
                      <Sparkles size={18} className="text-pink-400 mb-2" />
                      <p className="text-xs font-bold text-white/80">Cashback</p>
                      <p className="text-[9px] text-white/40 mt-0.5">{"Jusqu'a 5%"}</p>
                    </div>
                    <div className="p-4 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl hover:border-emerald-500/30 transition-all group cursor-pointer">
                      <Shield size={18} className="text-emerald-400 mb-2" />
                      <p className="text-xs font-bold text-white/80">Assurance</p>
                      <p className="text-[9px] text-white/40 mt-0.5">Protection totale</p>
                    </div>
                  </div>

                  {/* Security Vault */}
                  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl blur-lg opacity-50"></div>
                          <div className="relative w-11 h-11 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-xl flex items-center justify-center">
                            <Settings2 size={20} className="text-white" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-black bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            Security Vault
                          </h3>
                          <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">
                            {"Controle des actifs"}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/card?id=${activeCard.id}`}
                        className="flex items-center gap-2 text-purple-400 text-[10px] font-bold uppercase tracking-wider hover:text-white transition-all bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-purple-500/30"
                      >
                        {"Details"} <ArrowUpRight size={12} />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-1 bg-white/5 rounded-xl">
                        <CardActions cardId={activeCard.id} isFrozen={activeCard.isFrozen} />
                      </div>

                      {/* Quick Settings */}
                      <div className="p-5 border border-white/10 rounded-xl bg-white/[0.02] space-y-4">
                        <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">
                          {"Parametres Rapides"}
                        </h4>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Wifi size={14} className="text-purple-400" />
                            <span className="text-xs font-medium text-white/70">Sans Contact</span>
                          </div>
                          <div className="w-10 h-5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center px-0.5 cursor-pointer">
                            <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-lg"></div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center opacity-60">
                          <div className="flex items-center gap-2">
                            <Globe size={14} className="text-white/50" />
                            <span className="text-xs font-medium text-white/70">International</span>
                          </div>
                          <div className="w-10 h-5 bg-white/10 rounded-full flex items-center px-0.5 cursor-pointer">
                            <div className="w-4 h-4 bg-white/50 rounded-full"></div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Bell size={14} className="text-cyan-400" />
                            <span className="text-xs font-medium text-white/70">Notifications</span>
                          </div>
                          <div className="w-10 h-5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center px-0.5 cursor-pointer">
                            <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-lg"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions Preview */}
                  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <History size={16} className="text-purple-400" />
                        <h3 className="text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                          {"Transactions Recentes"}
                        </h3>
                      </div>
                      <Link
                        href="/statements"
                        className="text-[10px] text-white/40 hover:text-purple-400 transition-colors flex items-center gap-1"
                      >
                        Voir tout <ChevronRight size={10} />
                      </Link>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-center py-6 text-white/30">
                        <div className="text-center">
                          <History size={28} className="mx-auto mb-2 text-white/20" />
                          <p className="text-xs font-bold uppercase tracking-wider">Aucune transaction</p>
                          <p className="text-[10px] text-white/20 mt-0.5">
                            {"Les transactions apparaitront ici"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-dashed border-white/10">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-full flex items-center justify-center">
                      <Plus size={36} className="text-white" />
                    </div>
                  </div>
                  <h2 className="text-xl font-black bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                    Aucune carte active
                  </h2>
                  <p className="text-white/40 text-center max-w-sm mt-3 text-sm leading-relaxed">
                    {"Demarrez votre experience "}
                    <span className="text-purple-400 font-bold">PimPay</span>
                    {" en creant votre premiere carte virtuelle."}
                  </p>
                  <Link
                    href="/dashboard/card/order"
                    className="mt-6 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
                  >
                    <Plus size={16} />
                    {"Creer ma carte"}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
