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
  ArrowUpRight,
  Wallet,
  Globe,
  Sparkles,
  Shield,
  Activity,
  BarChart3,
  Bell,
  ChevronRight,
  Cpu,
  Database,
  Layers,
  RefreshCcw,
  Send,
  Star,
  Target,
  Wifi
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
      }
    });
  } catch { return null; }
}

export default async function GlobalCardsPage({ searchParams }: { searchParams: { id?: string } }) {
  const user = await getAuthenticatedUser();

  if (!user) return (
    <div className="min-h-screen bg-[#030014] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
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
        <p className="text-white/60 text-sm font-bold uppercase tracking-[0.3em]">Accès restreint à PimPay</p>
        <Link href="/login" className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-2xl text-white font-bold text-sm hover:opacity-90 transition-all">
          Se connecter
        </Link>
      </div>
    </div>
  );

  const cards = user.virtualCards || [];
  const selectedCardsId = searchParams.id || (cards.length > 0 ? cards[0].id : null);
  const activeCard = cards.find(c => c.id === selectedCardsId) || cards[0];

  // Calcul des statistiques
  const totalBalance = cards.reduce((acc, c) => acc + (c.balance || 0), 0);
  const totalSpent = cards.reduce((acc, c) => acc + (c.totalSpent || 0), 0);

  return (
    <div className="min-h-screen bg-[#030014] text-white pb-32 font-sans relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[180px]"></div>
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[180px]"></div>
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-pink-500/8 rounded-full blur-[180px]"></div>
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      <div className="relative z-10">
        {/* HEADER - Web3 Style */}
        <header className="px-6 pt-8 pb-6 border-b border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Logo & Title */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl blur-lg opacity-50"></div>
                  <div className="relative w-14 h-14 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-2xl flex items-center justify-center">
                    <Wallet size={28} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight">
                    Pim<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Cards</span>
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Web3 Finance • Mainnet Active</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Link 
                  href="/statements" 
                  className="group p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all"
                >
                  <History size={20} className="text-white/60 group-hover:text-purple-400 transition-colors" />
                </Link>
                <Link 
                  href="/notifications" 
                  className="group p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-cyan-500/50 transition-all relative"
                >
                  <Bell size={20} className="text-white/60 group-hover:text-cyan-400 transition-colors" />
                  <div className="absolute top-3 right-3 w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                </Link>
                <button className="group flex items-center gap-3 bg-gradient-to-r from-purple-600 to-cyan-500 text-white px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all active:scale-95">
                  <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span className="hidden sm:inline">Émettre une carte</span>
                </button>
              </div>
            </div>

            {/* Stats Banner */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <div className="p-5 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <Wallet size={18} className="text-purple-400" />
                  </div>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Balance Totale</span>
                </div>
                <p className="text-2xl font-black">${totalBalance.toLocaleString()}</p>
              </div>

              <div className="p-5 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                    <TrendingUp size={18} className="text-cyan-400" />
                  </div>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Dépenses</span>
                </div>
                <p className="text-2xl font-black">${totalSpent.toLocaleString()}</p>
              </div>

              <div className="p-5 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                    <CreditCard size={18} className="text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Cartes Actives</span>
                </div>
                <p className="text-2xl font-black">{cards.filter(c => !c.isFrozen).length}</p>
              </div>

              <div className="p-5 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 hover:border-pink-500/30 transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
                    <Shield size={18} className="text-pink-400" />
                  </div>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Sécurité</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black text-emerald-400">100%</p>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 mt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Section Gauche : Liste des cartes */}
            <div className="lg:col-span-4 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Portefeuille ({cards.length})
                </h3>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-full border border-purple-500/20">
                  <Cpu size={12} className="text-purple-400" />
                  <span className="text-[9px] font-bold text-purple-400 uppercase">GCV Standard</span>
                </div>
              </div>

              <div className="flex lg:flex-col gap-4 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
                {cards.map((c) => (
                  <Link
                    href={`?id=${c.id}`}
                    key={c.id}
                    className={`flex-shrink-0 w-[300px] lg:w-full p-6 rounded-[28px] border transition-all duration-300 group relative overflow-hidden ${
                      activeCard?.id === c.id
                      ? 'border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 shadow-2xl shadow-purple-500/10'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Active indicator */}
                    {activeCard?.id === c.id && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-cyan-500"></div>
                    )}
                    
                    {/* Frozen overlay */}
                    {c.isFrozen && (
                      <div className="absolute top-4 right-4 px-2 py-1 bg-red-500/20 rounded-full border border-red-500/30">
                        <span className="text-[8px] font-bold text-red-400 uppercase">Gelée</span>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-3 rounded-2xl transition-all ${
                        activeCard?.id === c.id 
                        ? 'bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/25' 
                        : 'bg-white/5 text-white/50 group-hover:bg-white/10'
                      }`}>
                        <CreditCard size={22} />
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-[9px] font-bold text-white/40 uppercase">Solde</p>
                        <p className={`text-lg font-bold ${activeCard?.id === c.id ? 'text-white' : 'text-white/70'}`}>
                          ${(c.balance || 12450).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Card Member</p>
                      <p className="text-xl font-mono font-bold text-white mt-1 tracking-[0.15em]">
                        •••• •••• •••• {c.number.slice(-4)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${c.isFrozen ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                        <span className="text-[9px] font-medium text-white/40">{c.isFrozen ? 'Inactive' : 'Active'}</span>
                      </div>
                      <span className="text-[9px] font-bold text-white/30">{c.brand?.toUpperCase() || 'MASTERCARD'}</span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Security Report */}
              <div className="hidden lg:block p-6 rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <ShieldCheck size={20} className="text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">PimPay Protection</span>
                </div>
                <p className="text-[11px] text-emerald-200/60 leading-relaxed">
                  Analyse biométrique active. Aucune tentative de fraude détectée sur vos actifs ces dernières 24h.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Activity size={14} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-medium">Monitoring en temps réel</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="hidden lg:grid grid-cols-2 gap-3">
                <button className="group p-4 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl hover:border-purple-500/30 hover:bg-purple-500/5 transition-all">
                  <Send size={18} className="text-white/50 group-hover:text-purple-400 mb-2 transition-colors" />
                  <span className="text-[10px] font-bold text-white/50 group-hover:text-white/70 uppercase">Envoyer</span>
                </button>
                <button className="group p-4 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
                  <RefreshCcw size={18} className="text-white/50 group-hover:text-cyan-400 mb-2 transition-colors" />
                  <span className="text-[10px] font-bold text-white/50 group-hover:text-white/70 uppercase">Échanger</span>
                </button>
              </div>
            </div>

            {/* Section Droite : Détails de la carte */}
            <div className="lg:col-span-8 space-y-8">
              {activeCard ? (
                <>
                  {/* Card Preview & Stats */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Virtual Card */}
                    <div className="relative group">
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-[32px] blur-2xl transform scale-95 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="relative">
                        <VirtualCard card={activeCard} user={user} />
                        
                        {activeCard.isFrozen && (
                          <div className="absolute inset-0 bg-[#030014]/90 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center border border-red-500/30">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                              <Lock className="text-red-500" size={28} />
                            </div>
                            <div className="bg-red-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Carte Gelée
                            </div>
                          </div>
                        )}

                        <Link
                          href={`/cards/${activeCard.id}`}
                          className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-gradient-to-r hover:from-purple-500 hover:to-cyan-500 border border-white/10 backdrop-blur-md rounded-xl text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Eye size={18} />
                        </Link>
                      </div>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="flex flex-col gap-4">
                      {/* Credit Metrics */}
                      <div className="flex-1 bg-white/[0.02] backdrop-blur-xl border border-white/10 p-6 rounded-[24px] relative overflow-hidden group hover:border-purple-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <BarChart3 size={100} className="text-purple-500" />
                        </div>
                        
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 text-purple-400 mb-4">
                            <Zap size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Credit Metrics</span>
                          </div>
                          
                          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Utilisation Mensuelle</p>
                          <div className="flex items-baseline gap-3 mt-1">
                            <h2 className="text-4xl font-black">${activeCard.totalSpent?.toLocaleString() || '0'}</h2>
                            <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                              <ArrowUpRight size={12} /> +2.4%
                            </span>
                          </div>

                          <div className="w-full bg-white/5 h-2 rounded-full mt-6 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-cyan-500 h-full rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-1000"
                              style={{ width: `${Math.min(((activeCard.totalSpent || 0) / (activeCard.dailyLimit || 10000)) * 100, 100)}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between mt-3">
                            <p className="text-[10px] text-white/40 font-medium">Limite: ${activeCard.dailyLimit?.toLocaleString() || '10,000'}</p>
                            <p className="text-[10px] text-purple-400 font-bold uppercase">Standard Tier</p>
                          </div>
                        </div>
                      </div>

                      {/* Blockchain Status */}
                      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-[20px] flex gap-4 items-center">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                          <Database className="text-amber-400" size={22} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-amber-200 font-bold uppercase tracking-tight">Ledger PI Validation</p>
                          <p className="text-[10px] text-amber-500/70 font-medium mt-1">
                            Synchronisé avec le Mainnet. Transactions irréversibles via protocole GCV.
                          </p>
                        </div>
                        <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[20px] hover:border-purple-500/30 transition-all group cursor-pointer">
                      <Globe size={20} className="text-purple-400 mb-3" />
                      <p className="text-xs font-bold text-white/80">Paiements Globaux</p>
                      <p className="text-[9px] text-white/40 mt-1">200+ pays</p>
                    </div>
                    <div className="p-5 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[20px] hover:border-cyan-500/30 transition-all group cursor-pointer">
                      <Wifi size={20} className="text-cyan-400 mb-3" />
                      <p className="text-xs font-bold text-white/80">Sans Contact</p>
                      <p className="text-[9px] text-white/40 mt-1">NFC activé</p>
                    </div>
                    <div className="p-5 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[20px] hover:border-pink-500/30 transition-all group cursor-pointer">
                      <Sparkles size={20} className="text-pink-400 mb-3" />
                      <p className="text-xs font-bold text-white/80">Cashback Crypto</p>
                      <p className="text-[9px] text-white/40 mt-1">Jusqu'à 5%</p>
                    </div>
                    <div className="p-5 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[20px] hover:border-emerald-500/30 transition-all group cursor-pointer">
                      <Shield size={20} className="text-emerald-400 mb-3" />
                      <p className="text-xs font-bold text-white/80">Assurance</p>
                      <p className="text-[9px] text-white/40 mt-1">Protection totale</p>
                    </div>
                  </div>

                  {/* Security Vault */}
                  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-8 rounded-[28px] relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl blur-lg opacity-50"></div>
                          <div className="relative w-14 h-14 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-2xl flex items-center justify-center">
                            <Settings2 size={24} className="text-white" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-black bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Security Vault</h3>
                          <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Contrôle granulaire des actifs</p>
                        </div>
                      </div>
                      <Link 
                        href={`/cards/${activeCard.id}`} 
                        className="flex items-center gap-2 text-purple-400 text-[10px] font-bold uppercase tracking-wider hover:text-white transition-all bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:border-purple-500/30"
                      >
                        Détails complets <ArrowUpRight size={14} />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-1 bg-white/5 rounded-[20px]">
                        <CardActions cardId={activeCard.id} isFrozen={activeCard.isFrozen} />
                      </div>
                      
                      {/* Quick Settings */}
                      <div className="p-6 border border-white/10 rounded-[20px] bg-white/[0.02] space-y-5">
                        <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-4">Paramètres Rapides</h4>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Wifi size={16} className="text-purple-400" />
                            <span className="text-xs font-medium text-white/70">Paiement Sans Contact</span>
                          </div>
                          <div className="w-12 h-6 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center px-1 cursor-pointer">
                            <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-lg"></div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center opacity-60">
                          <div className="flex items-center gap-3">
                            <Globe size={16} className="text-white/50" />
                            <span className="text-xs font-medium text-white/70">Achats Internationaux</span>
                          </div>
                          <div className="w-12 h-6 bg-white/10 rounded-full flex items-center px-1 cursor-pointer">
                            <div className="w-4 h-4 bg-white/50 rounded-full"></div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Bell size={16} className="text-cyan-400" />
                            <span className="text-xs font-medium text-white/70">Notifications</span>
                          </div>
                          <div className="w-12 h-6 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center px-1 cursor-pointer">
                            <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-lg"></div>
                          </div>
                        </div>

                        <p className="text-[9px] text-white/30 italic pt-2 border-t border-white/5">
                          * Paramètres modifiables instantanément
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions Preview */}
                  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-6 rounded-[24px]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <History size={18} className="text-purple-400" />
                        <h3 className="text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                          Transactions Récentes
                        </h3>
                      </div>
                      <Link href="/statements" className="text-[10px] text-white/40 hover:text-purple-400 transition-colors flex items-center gap-1">
                        Voir tout <ChevronRight size={12} />
                      </Link>
                    </div>

                    <div className="space-y-3">
                      {[
                        { name: 'Netflix', amount: -15.99, type: 'subscription', date: 'Aujourd\'hui' },
                        { name: 'Transfert reçu', amount: 250.00, type: 'transfer', date: 'Hier' },
                        { name: 'Amazon', amount: -89.99, type: 'shopping', date: '2 jours' },
                      ].map((tx, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-500/20' : 'bg-purple-500/20'}`}>
                              {tx.amount > 0 ? <ArrowUpRight size={18} className="text-emerald-400" /> : <Zap size={18} className="text-purple-400" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white/80">{tx.name}</p>
                              <p className="text-[10px] text-white/40">{tx.date}</p>
                            </div>
                          </div>
                          <p className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} $
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] backdrop-blur-xl rounded-[32px] border border-dashed border-white/10">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-full flex items-center justify-center">
                      <Plus size={40} className="text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-black bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                    Aucune carte active
                  </h2>
                  <p className="text-white/40 text-center max-w-sm mt-4 text-sm leading-relaxed">
                    Démarrez votre expérience <span className="text-purple-400 font-bold">PimPay</span> en créant votre première carte virtuelle sécurisée.
                  </p>
                  <button className="mt-8 flex items-center gap-3 bg-gradient-to-r from-purple-600 to-cyan-500 text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all">
                    <Plus size={18} />
                    Créer ma première carte
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
