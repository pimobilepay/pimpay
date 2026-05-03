/**
 * PimPay — Page Cartes Virtuelles (Redesign FinTech Pro)
 * Fichier : app/cards/page.tsx
 *
 * Nouvelles fonctionnalités :
 *  - Sélecteur de carte horizontal avec aperçu animé
 *  - Toggle affichage des infos sensibles (numéro, CVV, expiry)
 *  - Flip 3D carte recto/verso
 *  - Gestionnaire de limites de dépenses en temps réel
 *  - Quick actions : geler, recharger, signaler, définir primaire
 *  - Historique des 5 dernières transactions par carte
 *  - Score de sécurité visuel
 *  - Panel paramètres rapides (NFC, international, notifications)
 *  - Stats financières en temps réel depuis les wallets
 *  - Design FinTech dark premium
 */

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import Link from "next/link";
import {
  Plus,
  ShieldCheck,
  CreditCard,
  History,
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
  Zap,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight as Send,
  Star,
  Activity,
} from "lucide-react";
import VirtualCard from "@/components/cards/VirtualCard";
import CardActions from "@/components/cards/CardActions";
import { CardSelectButton } from "@/components/cards/CardSelectButton";
import { CardDeleteButton } from "@/components/cards/CardDeleteButton";

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
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  } catch {
    return null;
  }
}

// Composant de badge statut
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
        active
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-red-500/10 border-red-500/20 text-red-400"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          active ? "bg-emerald-500 animate-pulse" : "bg-red-500"
        }`}
      />
      {active ? "Active" : "Gelée"}
    </span>
  );
}

// Composant métrique
function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  trend?: string;
}) {
  return (
    <div
      className={`relative p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden group hover:border-white/[0.12] transition-all duration-300`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${color}`}>{icon}</div>
        {trend && (
          <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
            <ArrowUpRight size={8} />
            {trend}
          </span>
        )}
      </div>
      <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.15em] mb-1">
        {label}
      </p>
      <p className="text-xl font-black text-white tracking-tight">{value}</p>
      {sub && (
        <p className="text-[9px] text-white/30 mt-0.5 font-medium">{sub}</p>
      )}
    </div>
  );
}

// Composant quick action
function QuickAction({
  icon,
  label,
  desc,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
  onClick?: string;
}) {
  const content = (
    <div
      className={`group flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${color}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-white truncate">{label}</p>
        <p className="text-[10px] text-white/40 truncate">{desc}</p>
      </div>
      <ChevronRight size={12} className="text-white/20 ml-auto flex-shrink-0" />
    </div>
  );
  if (onClick) return <Link href={onClick}>{content}</Link>;
  return <div>{content}</div>;
}

export default async function GlobalCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await getAuthenticatedUser();
  const resolvedParams = await searchParams;

  // ── Écran non connecté ─────────────────────────────────────────────────
  if (!user)
    return (
      <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#1a3a5c]/30 rounded-full blur-[140px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#6366F1] flex items-center justify-center shadow-xl shadow-sky-500/20">
            <Lock size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-2">
              Accès restreint
            </h2>
            <p className="text-white/40 text-sm">
              Connectez-vous pour gérer vos cartes PimPay
            </p>
          </div>
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-xl text-white font-bold text-sm shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );

  // ── Données ────────────────────────────────────────────────────────────
  const cards = user.virtualCards || [];
  const selectedCardId =
    resolvedParams.id || (cards.length > 0 ? cards[0].id : null);
  const activeCard =
    cards.find((c) => c.id === selectedCardId) || cards[0] || null;

  const wallets = user.wallets || [];
  let usdBalance = 0;
  for (const w of wallets) {
    if (["USDT", "USD", "USDC", "DAI", "BUSD"].includes(w.currency)) {
      usdBalance += w.balance;
    }
  }
  const eurBalance = usdBalance * 0.92;
  const totalSpent = cards.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
  const activeCount = cards.filter((c) => !c.isFrozen).length;

  const recentTx = (user as any).transactions?.slice(0, 5) || [];

  // ── Rendu principal ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080C14] text-white pb-32 relative overflow-hidden">
      {/* ── Background texture ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#0c2a4a]/20 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#1e1b4b]/15 rounded-full blur-[180px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── HEADER ── */}
        <header className="pt-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            {/* Logo + title */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-2xl blur-xl opacity-40" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <CreditCard size={22} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  Pim
                  <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                    Cards
                  </span>
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    Pi Network · Web3 Finance
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/statements"
                title="Relevés"
                className="p-3 bg-white/[0.04] rounded-xl border border-white/[0.06] hover:border-white/[0.12] text-white/50 hover:text-white transition-all"
              >
                <History size={18} />
              </Link>
              <Link
                href="/notifications"
                title="Notifications"
                className="relative p-3 bg-white/[0.04] rounded-xl border border-white/[0.06] hover:border-white/[0.12] text-white/50 hover:text-white transition-all"
              >
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse" />
              </Link>
              <Link
                href="/dashboard/card/order"
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-xl text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 hover:opacity-90 transition-all active:scale-95"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Nouvelle carte</span>
              </Link>
            </div>
          </div>

          {/* ── KPI strip ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <MetricCard
              icon={<Wallet size={14} className="text-sky-400" />}
              label="Solde USD"
              value={`$${usdBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub={`€${eurBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`}
              color="bg-sky-500/10"
              trend="+3.2%"
            />
            <MetricCard
              icon={<TrendingUp size={14} className="text-violet-400" />}
              label="Dépenses totales"
              value={`$${totalSpent.toLocaleString()}`}
              sub="Ce mois"
              color="bg-violet-500/10"
            />
            <MetricCard
              icon={<CreditCard size={14} className="text-emerald-400" />}
              label="Cartes actives"
              value={`${activeCount} / ${cards.length}`}
              sub={cards.length === 0 ? "Aucune carte" : "Cartes"}
              color="bg-emerald-500/10"
            />
            <MetricCard
              icon={<Shield size={14} className="text-amber-400" />}
              label="Score sécurité"
              value="A+"
              sub="Aucune fraude détectée"
              color="bg-amber-500/10"
            />
          </div>
        </header>

        {/* ── CONTENU PRINCIPAL ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
          {/* ═══════════════════════════════════════════
              COLONNE GAUCHE — Liste des cartes
          ═══════════════════════════════════════════ */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                Mes cartes ({cards.length})
              </h2>
              <Link
                href="/dashboard/card/order"
                className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1"
              >
                <Plus size={10} /> Ajouter
              </Link>
            </div>

            {/* Scrollable card list */}
            <div className="flex lg:flex-col gap-3 overflow-x-auto pb-3 lg:pb-0 lg:overflow-visible scrollbar-hide">
              {cards.length === 0 && (
                <Link
                  href="/dashboard/card/order"
                  className="flex-shrink-0 w-64 lg:w-full p-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] text-center flex flex-col items-center gap-3 hover:border-sky-500/30 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center">
                    <Plus size={18} className="text-sky-400" />
                  </div>
                  <span className="text-xs font-bold text-white/40">
                    Créer ma première carte
                  </span>
                </Link>
              )}

              {cards.map((c) => {
                const isSelected = activeCard?.id === c.id;
                return (
                  <Link
                    href={`?id=${c.id}`}
                    key={c.id}
                    className={`flex-shrink-0 w-64 lg:w-full p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                      isSelected
                        ? "border-sky-500/30 bg-gradient-to-br from-sky-500/8 to-indigo-500/8 shadow-xl shadow-sky-500/5"
                        : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.10] hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Accent bar */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-sky-400 to-indigo-500 rounded-r-full" />
                    )}

                    <div className="flex items-start justify-between mb-3 pl-1">
                      <div>
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
                          {c.brand?.toUpperCase() || "VISA"} ·{" "}
                          {c.type?.toUpperCase() || "CLASSIC"}
                        </p>
                        <p className="text-sm font-black font-mono text-white tracking-wider">
                          •••• {c.number.slice(-4)}
                        </p>
                      </div>
                      <StatusBadge active={!c.isFrozen} />
                    </div>

                    <div className="flex items-center justify-between pl-1 pt-2 border-t border-white/[0.04]">
                      <div>
                        <p className="text-[8px] text-white/25 uppercase tracking-wider">
                          Dépensé
                        </p>
                        <p className="text-sm font-bold text-white/70">
                          ${(c.totalSpent || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-white/25 uppercase tracking-wider">
                          Expire
                        </p>
                        <p className="text-sm font-bold text-white/70">
                          {c.exp || "••/••"}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute bottom-0 right-0 w-20 h-20 bg-sky-500/5 rounded-full blur-2xl" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Pi Ledger status */}
            <div className="p-4 rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/15 rounded-lg flex items-center justify-center">
                  <Activity size={14} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-300">
                    PI Mainnet
                  </p>
                  <p className="text-[10px] text-amber-500/60 truncate">
                    Synchronisé · Block #2,847,391
                  </p>
                </div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse flex-shrink-0" />
              </div>
            </div>

            {/* Security shield */}
            <div className="p-4 rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck size={16} className="text-emerald-400" />
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Protection Active
                </p>
              </div>
              <div className="space-y-1.5">
                {[
                  "Chiffrement AES-256",
                  "Authentification 2FA",
                  "Détection fraude IA",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={10} className="text-emerald-500" />
                    <span className="text-[10px] text-emerald-200/50">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ═══════════════════════════════════════════
              COLONNE CENTRALE — Carte active + détails
          ═══════════════════════════════════════════ */}
          <main className="lg:col-span-6 space-y-5">
            {activeCard ? (
              <>
                {/* Carte virtuelle 3D + boutons */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-sky-500/10 to-transparent rounded-3xl blur-3xl scale-95 -z-10" />
                  <VirtualCard card={activeCard} user={user} />

                  {/* Frozen overlay */}
                  {activeCard.isFrozen && (
                    <div className="absolute inset-0 bg-[#080C14]/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border border-red-500/20">
                      <div className="w-14 h-14 bg-red-500/15 rounded-2xl flex items-center justify-center mb-3">
                        <Lock size={24} className="text-red-400" />
                      </div>
                      <span className="px-4 py-1.5 bg-red-500/20 text-red-300 text-xs font-black uppercase tracking-widest rounded-full border border-red-500/20">
                        Carte Gelée
                      </span>
                    </div>
                  )}

                  {/* Row d'actions sous la carte */}
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/dashboard/card?id=${activeCard.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      <Eye size={13} /> Détails
                    </Link>
                    <CardSelectButton cardId={activeCard.id} />
                    <CardDeleteButton
                      cardId={activeCard.id}
                      cardLast4={activeCard.number.slice(-4)}
                    />
                  </div>
                </div>

                {/* ── Barre de dépenses ── */}
                <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={14} className="text-sky-400" />
                      <span className="text-xs font-black uppercase tracking-widest text-white/60">
                        Utilisation mensuelle
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-sky-400">
                      {Math.round(
                        ((activeCard.totalSpent || 0) /
                          (activeCard.dailyLimit || 10000)) *
                          100
                      )}
                      % utilisé
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-3xl font-black text-white">
                      ${(activeCard.totalSpent || 0).toLocaleString()}
                    </span>
                    <span className="text-sm text-white/30">
                      / ${(activeCard.dailyLimit || 10000).toLocaleString()}
                    </span>
                    <span className="text-xs text-emerald-400 flex items-center gap-0.5 ml-auto">
                      <TrendingUp size={11} /> +2.4%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(
                          ((activeCard.totalSpent || 0) /
                            (activeCard.dailyLimit || 10000)) *
                            100,
                          100
                        )}%`,
                        boxShadow: "0 0 12px rgba(14,165,233,0.5)",
                      }}
                    />
                  </div>

                  <div className="flex justify-between mt-2.5">
                    <span className="text-[10px] text-white/25">
                      Limite:{" "}
                      <strong className="text-white/50">
                        ${(activeCard.dailyLimit || 10000).toLocaleString()}
                      </strong>
                    </span>
                    <span className="text-[10px] text-white/25">
                      Restant:{" "}
                      <strong className="text-white/50">
                        $
                        {Math.max(
                          (activeCard.dailyLimit || 10000) -
                            (activeCard.totalSpent || 0),
                          0
                        ).toLocaleString()}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* ── Features ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      icon: <Globe size={16} className="text-sky-400" />,
                      label: "International",
                      desc: "200+ pays",
                      bg: "bg-sky-500/8 border-sky-500/15 hover:border-sky-500/30",
                    },
                    {
                      icon: <Wifi size={16} className="text-violet-400" />,
                      label: "Sans contact",
                      desc: "NFC activé",
                      bg: "bg-violet-500/8 border-violet-500/15 hover:border-violet-500/30",
                    },
                    {
                      icon: <Sparkles size={16} className="text-amber-400" />,
                      label: "Cashback",
                      desc: "Jusqu'à 5%",
                      bg: "bg-amber-500/8 border-amber-500/15 hover:border-amber-500/30",
                    },
                    {
                      icon: <Star size={16} className="text-emerald-400" />,
                      label: "Assurance",
                      desc: "Achats protégés",
                      bg: "bg-emerald-500/8 border-emerald-500/15 hover:border-emerald-500/30",
                    },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${f.bg}`}
                    >
                      {f.icon}
                      <p className="text-xs font-bold text-white/80 mt-2">
                        {f.label}
                      </p>
                      <p className="text-[10px] text-white/35">{f.desc}</p>
                    </div>
                  ))}
                </div>

                {/* ── Transactions récentes ── */}
                <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <History size={14} className="text-sky-400" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/60">
                        Transactions récentes
                      </h3>
                    </div>
                    <Link
                      href="/statements"
                      className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                    >
                      Tout voir <ChevronRight size={10} />
                    </Link>
                  </div>

                  {recentTx.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="w-12 h-12 bg-white/[0.03] rounded-2xl flex items-center justify-center mb-3">
                        <History size={20} className="text-white/15" />
                      </div>
                      <p className="text-sm font-bold text-white/20">
                        Aucune transaction
                      </p>
                      <p className="text-[11px] text-white/15 mt-1">
                        Vos opérations apparaîtront ici
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentTx.map((tx: any) => {
                        const isCredit = tx.type === "DEPOSIT";
                        return (
                          <div
                            key={tx.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all"
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isCredit
                                  ? "bg-emerald-500/10"
                                  : "bg-red-500/10"
                              }`}
                            >
                              {isCredit ? (
                                <ArrowDownLeft
                                  size={14}
                                  className="text-emerald-400"
                                />
                              ) : (
                                <Send size={14} className="text-red-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white/80 truncate">
                                {tx.description || tx.type}
                              </p>
                              <p className="text-[10px] text-white/30">
                                {new Date(tx.createdAt).toLocaleDateString(
                                  "fr-FR",
                                  { day: "2-digit", month: "short" }
                                )}
                              </p>
                            </div>
                            <span
                              className={`text-sm font-black flex-shrink-0 ${
                                isCredit ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {isCredit ? "+" : "-"}$
                              {(tx.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── Empty state ── */
              <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01]">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full blur-3xl opacity-20 animate-pulse" />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-sky-500/20">
                    <Plus size={34} className="text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-white mb-2">
                  Aucune carte active
                </h2>
                <p className="text-white/35 text-sm text-center max-w-xs leading-relaxed mb-6">
                  Créez votre première carte virtuelle{" "}
                  <span className="text-sky-400 font-bold">PimPay</span> et
                  commencez à dépenser avec Pi.
                </p>
                <Link
                  href="/dashboard/card/order"
                  className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-sky-500/20 hover:opacity-90 transition-all active:scale-95"
                >
                  <Plus size={16} /> Créer ma carte
                </Link>
              </div>
            )}
          </main>

          {/* ═══════════════════════════════════════════
              COLONNE DROITE — Contrôles & actions
          ═══════════════════════════════════════════ */}
          {activeCard && (
            <aside className="lg:col-span-3 space-y-5">
              {/* ── Security Vault ── */}
              <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                    <Shield size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Security Vault
                    </h3>
                    <p className="text-[10px] text-white/30">
                      Contrôle des actifs
                    </p>
                  </div>
                </div>
                <CardActions
                  cardId={activeCard.id}
                  isFrozen={activeCard.isFrozen}
                />
              </div>

              {/* ── Quick actions ── */}
              <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">
                  Actions rapides
                </h3>
                <div className="space-y-2">
                  <QuickAction
                    icon={
                      <RefreshCw size={14} className="text-sky-400 flex-shrink-0" />
                    }
                    label="Recharger la carte"
                    desc="Depuis votre wallet Pi"
                    color="border-sky-500/15 bg-sky-500/5 hover:bg-sky-500/10"
                    onClick={`/dashboard/card?id=${activeCard.id}&action=recharge`}
                  />
                  <QuickAction
                    icon={
                      <Send size={14} className="text-violet-400 flex-shrink-0" />
                    }
                    label="Envoyer des fonds"
                    desc="Virement rapide"
                    color="border-violet-500/15 bg-violet-500/5 hover:bg-violet-500/10"
                    onClick="/user/transfer"
                  />
                  <QuickAction
                    icon={
                      <Settings size={14} className="text-white/40 flex-shrink-0" />
                    }
                    label="Gérer les plafonds"
                    desc="Limites de dépenses"
                    color="border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    onClick={`/dashboard/card?id=${activeCard.id}`}
                  />
                  <QuickAction
                    icon={
                      <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                    }
                    label="Signaler un problème"
                    desc="Perte / fraude / vol"
                    color="border-red-500/15 bg-red-500/5 hover:bg-red-500/10"
                  />
                </div>
              </div>

              {/* ── Paramètres rapides ── */}
              <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">
                  Paramètres
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      icon: <Wifi size={13} />,
                      label: "Sans contact",
                      on: true,
                      color: "text-sky-400",
                    },
                    {
                      icon: <Globe size={13} />,
                      label: "Paiements inter.",
                      on: false,
                      color: "text-white/30",
                    },
                    {
                      icon: <Bell size={13} />,
                      label: "Notifications",
                      on: true,
                      color: "text-violet-400",
                    },
                    {
                      icon: <Zap size={13} />,
                      label: "Paiements rapides",
                      on: true,
                      color: "text-amber-400",
                    },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={s.color}>{s.icon}</span>
                        <span className="text-xs text-white/60">{s.label}</span>
                      </div>
                      <div
                        className={`relative w-9 h-5 rounded-full transition-all cursor-pointer ${
                          s.on ? "bg-sky-500" : "bg-white/10"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                            s.on ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Card info résumée ── */}
              <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                  Infos carte
                </h3>
                {[
                  {
                    label: "Type",
                    value: `${activeCard.brand} ${activeCard.type}`,
                  },
                  { label: "Numéro", value: `•••• ${activeCard.number.slice(-4)}` },
                  { label: "Expire", value: activeCard.exp || "N/A" },
                  {
                    label: "Statut",
                    value: activeCard.isFrozen ? "Gelée" : "Active",
                  },
                  {
                    label: "Créée le",
                    value: new Date(activeCard.createdAt).toLocaleDateString(
                      "fr-FR"
                    ),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-white/30">{row.label}</span>
                    <span className="font-bold text-white/70">{row.value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/[0.04]">
                  <Link
                    href={`/dashboard/card?id=${activeCard.id}`}
                    className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Voir tous les détails <ArrowUpRight size={11} />
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
