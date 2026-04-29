"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Users, UserCheck, UserX, UserPlus, Search, Filter, RefreshCw,
  ChevronRight, ChevronLeft, MoreVertical, Shield, ShieldOff,
  CheckCircle2, XCircle, Clock, Ban, Star, MapPin, Phone, Mail,
  TrendingUp, Wallet, BadgeCheck, AlertTriangle, Loader2,
  Send, Eye, ArrowUpDown, Download, UserMinus, Zap, Globe,
  BarChart2, Activity, Calendar, Hash,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = "ACTIVE" | "PENDING" | "BANNED" | "SUSPENDED" | "FROZEN";

interface Agent {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  phone: string | null;
  avatar: string | null;
  city: string | null;
  country: string | null;
  status: AgentStatus;
  kycStatus: string;
  createdAt: string;
  lastLogin: string | null;
  wallet?: { balance: number } | null;
}

interface Stats {
  total: number;
  active: number;
  pending: number;
  banned: number;
  suspended: number;
}

interface Candidate {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  phone: string | null;
  avatar: string | null;
  city: string | null;
  country: string | null;
  kycStatus: string;
  createdAt: string;
}

type TabFilter = "all" | "active" | "pending" | "banned" | "suspended";
type SortKey = "name" | "createdAt" | "balance" | "lastLogin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ACTIVE:    { label: "Actif",     color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: <CheckCircle2 size={10} /> },
  PENDING:   { label: "En attente",color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/30",   icon: <Clock size={10} /> },
  BANNED:    { label: "Banni",     color: "text-red-400",     bg: "bg-red-500/15 border-red-500/30",       icon: <Ban size={10} /> },
  SUSPENDED: { label: "Suspendu",  color: "text-orange-400",  bg: "bg-orange-500/15 border-orange-500/30", icon: <ShieldOff size={10} /> },
  FROZEN:    { label: "Gelé",      color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/30",     icon: <AlertTriangle size={10} /> },
};

function initials(name: string | null, email: string | null): string {
  const src = name || email || "??";
  return src.slice(0, 2).toUpperCase();
}

function timeSince(date: string | null): string {
  if (!date) return "Jamais";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 30) return `Il y a ${days}j`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)}m`;
  return `Il y a ${Math.floor(days / 365)}a`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border bg-white/[0.02] border-white/[0.06]`}>
      <div className={`${color} opacity-70`}>{icon}</div>
      <span className={`text-lg font-black ${color}`}>{value}</span>
      <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest text-center leading-tight">{label}</span>
    </div>
  );
}

function AgentRow({ agent, onAction, onView }: {
  agent: Agent;
  onAction: (agent: Agent, action: string) => void;
  onView: (agent: Agent) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.PENDING;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black flex-shrink-0 cursor-pointer"
        style={{ background: `hsl(${(agent.name || agent.email || "").charCodeAt(0) * 17 % 360}, 50%, 20%)`, border: "1.5px solid rgba(255,255,255,0.08)" }}
        onClick={() => onView(agent)}
      >
        {initials(agent.name, agent.email)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(agent)}>
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-bold text-white truncate">{agent.name || agent.username || "—"}</p>
          {agent.kycStatus === "VERIFIED" && <BadgeCheck size={11} className="text-blue-400 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-500 truncate">{agent.email || agent.phone || "—"}</span>
          {agent.city && (
            <span className="flex items-center gap-0.5 text-[9px] text-slate-600">
              <MapPin size={8} /> {agent.city}
            </span>
          )}
        </div>
      </div>

      {/* Balance */}
      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-[11px] font-bold text-white">
          {agent.wallet?.balance !== undefined ? `${agent.wallet.balance.toLocaleString("fr")} F` : "—"}
        </p>
        <p className="text-[9px] text-slate-600">{timeSince(agent.lastLogin)}</p>
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
        {cfg.icon}
        <span className="hidden xs:inline">{cfg.label}</span>
      </div>

      {/* Actions menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors active:scale-90"
        >
          <MoreVertical size={16} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                className="absolute right-0 top-10 z-20 w-44 bg-[#0d1425] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              >
                {[
                  { label: "Voir le profil", icon: <Eye size={12} />, action: "view" },
                  { label: "Activer", icon: <CheckCircle2 size={12} className="text-emerald-400" />, action: "setStatus:active", hide: agent.status === "ACTIVE" },
                  { label: "Suspendre", icon: <ShieldOff size={12} className="text-orange-400" />, action: "setStatus:suspended", hide: agent.status === "SUSPENDED" },
                  { label: "Bannir", icon: <Ban size={12} className="text-red-400" />, action: "setStatus:banned", hide: agent.status === "BANNED" },
                  { label: "Message de bienvenue", icon: <Send size={12} className="text-blue-400" />, action: "sendWelcome" },
                  { label: "Rétrograder", icon: <UserMinus size={12} className="text-slate-400" />, action: "demote" },
                ].filter((item) => !item.hide).map((item) => (
                  <button
                    key={item.action}
                    onClick={() => { setMenuOpen(false); if (item.action === "view") { onView(agent); } else { onAction(agent, item.action); } }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[11px] font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Agent Detail Drawer ──────────────────────────────────────────────────────

function AgentDrawer({ agent, onClose, onAction }: {
  agent: Agent | null;
  onClose: () => void;
  onAction: (agent: Agent, action: string) => void;
}) {
  if (!agent) return null;
  const cfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.PENDING;

  return (
    <AnimatePresence>
      {agent && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-[#070d1a] border-l border-white/[0.06] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#070d1a]/90 backdrop-blur-xl border-b border-white/[0.06] px-5 py-4 flex items-center justify-between">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Profil Agent</h2>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors">
                <XCircle size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-3xl flex items-center justify-center text-lg font-black"
                  style={{ background: `hsl(${(agent.name || agent.email || "").charCodeAt(0) * 17 % 360}, 50%, 20%)`, border: "2px solid rgba(255,255,255,0.08)" }}
                >
                  {initials(agent.name, agent.email)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-black text-white">{agent.name || agent.username || "—"}</p>
                    {agent.kycStatus === "VERIFIED" && <BadgeCheck size={14} className="text-blue-400" />}
                  </div>
                  <div className={`mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="space-y-2">
                {[
                  { icon: <Mail size={12} />, label: "Email", value: agent.email },
                  { icon: <Phone size={12} />, label: "Téléphone", value: agent.phone },
                  { icon: <Hash size={12} />, label: "Username", value: agent.username ? `@${agent.username}` : null },
                  { icon: <MapPin size={12} />, label: "Ville", value: agent.city },
                  { icon: <Globe size={12} />, label: "Pays", value: agent.country },
                  { icon: <Calendar size={12} />, label: "Inscription", value: new Date(agent.createdAt).toLocaleDateString("fr-FR") },
                  { icon: <Activity size={12} />, label: "Dernière connexion", value: timeSince(agent.lastLogin) },
                  { icon: <Wallet size={12} />, label: "Solde", value: agent.wallet?.balance !== undefined ? `${agent.wallet.balance.toLocaleString("fr")} FCFA` : "—" },
                ].map(({ icon, label, value }) => value ? (
                  <div key={label} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-slate-500 flex-shrink-0">{icon}</span>
                    <span className="text-[10px] text-slate-500 w-24 flex-shrink-0">{label}</span>
                    <span className="text-[11px] font-bold text-white truncate">{value}</span>
                  </div>
                ) : null)}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-3">Actions rapides</p>
                {agent.status !== "ACTIVE" && (
                  <button
                    onClick={() => onAction(agent, "setStatus:active")}
                    className="flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-colors active:scale-95"
                  >
                    <CheckCircle2 size={14} /> Activer l'agent
                  </button>
                )}
                {agent.status !== "SUSPENDED" && (
                  <button
                    onClick={() => onAction(agent, "setStatus:suspended")}
                    className="flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-bold hover:bg-orange-500/20 transition-colors active:scale-95"
                  >
                    <ShieldOff size={14} /> Suspendre
                  </button>
                )}
                {agent.status !== "BANNED" && (
                  <button
                    onClick={() => onAction(agent, "setStatus:banned")}
                    className="flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold hover:bg-red-500/20 transition-colors active:scale-95"
                  >
                    <Ban size={14} /> Bannir l'agent
                  </button>
                )}
                <button
                  onClick={() => onAction(agent, "sendWelcome")}
                  className="flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold hover:bg-blue-500/20 transition-colors active:scale-95"
                >
                  <Send size={14} /> Envoyer bienvenue
                </button>
                <button
                  onClick={() => onAction(agent, "demote")}
                  className="flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[11px] font-bold hover:bg-slate-500/20 transition-colors active:scale-95"
                >
                  <UserMinus size={14} /> Rétrograder en utilisateur
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Promote Modal ────────────────────────────────────────────────────────────

function PromoteModal({ onClose, onPromote }: { onClose: () => void; onPromote: (userId: string) => void }) {
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchCandidates = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/recruitment/candidates?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCandidates(search), 300);
  }, [search, fetchCandidates]);

  useEffect(() => { fetchCandidates(""); }, [fetchCandidates]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-x-4 top-1/4 z-50 max-w-md mx-auto bg-[#070d1a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white">Promouvoir en Agent</h3>
            <p className="text-[9px] text-slate-500 mt-0.5">Sélectionnez un utilisateur vérifié</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-slate-400"><XCircle size={15} /></button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl mb-4">
            <Search size={14} className="text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur..."
              className="flex-1 bg-transparent text-[12px] text-white placeholder-slate-600 outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="text-blue-500 animate-spin" /></div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-[11px]">Aucun candidat trouvé</div>
            ) : candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => onPromote(c.id)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl hover:bg-white/5 transition-colors text-left group"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: `hsl(${(c.name || c.email || "").charCodeAt(0) * 17 % 360}, 45%, 18%)`, border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {initials(c.name, c.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">{c.name || c.email}</p>
                  <p className="text-[9px] text-slate-500 truncate">{c.city || c.country || "—"}</p>
                </div>
                {c.kycStatus === "VERIFIED" && <BadgeCheck size={13} className="text-blue-400 flex-shrink-0" />}
                <ChevronRight size={13} className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Action Confirm Modal ─────────────────────────────────────────────────────

function ActionModal({
  agent,
  action,
  onClose,
  onConfirm,
}: {
  agent: Agent | null;
  action: string;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  if (!agent) return null;

  const needsReason = action.includes("suspended") || action.includes("banned");
  const labels: Record<string, { title: string; desc: string; btnColor: string; btnLabel: string }> = {
    "setStatus:active":    { title: "Activer l'agent",  desc: `Activer le compte de ${agent.name || agent.email} ?`,      btnColor: "bg-emerald-600 hover:bg-emerald-500", btnLabel: "Activer" },
    "setStatus:suspended": { title: "Suspendre",         desc: `Suspendre temporairement ${agent.name || agent.email} ?`,  btnColor: "bg-orange-600 hover:bg-orange-500",  btnLabel: "Suspendre" },
    "setStatus:banned":    { title: "Bannir l'agent",    desc: `Bannir définitivement ${agent.name || agent.email} ?`,     btnColor: "bg-red-600 hover:bg-red-500",        btnLabel: "Bannir" },
    sendWelcome:           { title: "Message de bienvenue", desc: `Envoyer un email de bienvenue à ${agent.email} ?`,     btnColor: "bg-blue-600 hover:bg-blue-500",      btnLabel: "Envoyer" },
    demote:                { title: "Rétrograder",        desc: `Retirer le rôle Agent de ${agent.name || agent.email} ?`, btnColor: "bg-slate-600 hover:bg-slate-500",    btnLabel: "Rétrograder" },
  };
  const cfg = labels[action] || { title: "Confirmer", desc: "Êtes-vous sûr ?", btnColor: "bg-blue-600", btnLabel: "Confirmer" };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-x-6 top-1/3 z-[70] max-w-sm mx-auto bg-[#070d1a] border border-white/10 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-sm font-black text-white mb-1">{cfg.title}</h3>
        <p className="text-[11px] text-slate-400 mb-4">{cfg.desc}</p>
        {needsReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison (optionnel)..."
            rows={2}
            className="w-full mb-4 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-[11px] text-white placeholder-slate-600 outline-none resize-none"
          />
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-bold text-slate-400 hover:bg-white/10 transition-colors">
            Annuler
          </button>
          <button onClick={() => onConfirm(reason || undefined)}
            className={`flex-1 py-3 rounded-2xl text-[11px] font-black text-white transition-colors ${cfg.btnColor}`}>
            {cfg.btnLabel}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecruitmentPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, pending: 0, banned: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // UI state
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [actionModal, setActionModal] = useState<{ agent: Agent; action: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout>();

  // ── Fetch ──

  const fetchAgents = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams({
        status: activeTab,
        search,
        page: String(page),
      });
      const res = await fetch(`/api/admin/recruitment?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAgents(data.agents || []);
      setStats(data.stats || { total: 0, active: 0, pending: 0, banned: 0, suspended: 0 });
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, search, page]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAgents(), 350);
  }, [fetchAgents]);

  // ── Sort ──

  const sortedAgents = [...agents].sort((a, b) => {
    if (sortKey === "name") return (a.name || "").localeCompare(b.name || "");
    if (sortKey === "balance") return (b.wallet?.balance || 0) - (a.wallet?.balance || 0);
    if (sortKey === "lastLogin") return new Date(b.lastLogin || 0).getTime() - new Date(a.lastLogin || 0).getTime();
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // ── Action handler ──

  const handleAction = (agent: Agent, action: string) => {
    if (action === "view") { setSelectedAgent(agent); return; }
    setActionModal({ agent, action });
  };

  const confirmAction = async (reason?: string) => {
    if (!actionModal) return;
    const { agent, action } = actionModal;
    setProcessing(true);
    setActionModal(null);

    try {
      let body: Record<string, unknown> = { userId: agent.id };

      if (action.startsWith("setStatus:")) {
        body = { ...body, action: "setStatus", newStatus: action.split(":")[1], reason };
      } else {
        body = { ...body, action };
      }

      const res = await fetch("/api/admin/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || "Action effectuée avec succès");
      fetchAgents({ silent: true });
      if (selectedAgent?.id === agent.id) setSelectedAgent(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setProcessing(false);
    }
  };

  const handlePromote = async (userId: string) => {
    setShowPromoteModal(false);
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "promote", userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Utilisateur promu agent avec succès");
      fetchAgents({ silent: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setProcessing(false);
    }
  };

  // ── Export CSV ──

  const exportCSV = () => {
    const rows = [
      ["Nom", "Email", "Téléphone", "Ville", "Statut", "KYC", "Solde", "Inscription"],
      ...agents.map((a) => [
        a.name || "", a.email || "", a.phone || "", a.city || "",
        a.status, a.kycStatus, String(a.wallet?.balance || 0),
        new Date(a.createdAt).toLocaleDateString("fr-FR"),
      ]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agents_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const TABS: { key: TabFilter; label: string; count: number }[] = [
    { key: "all",       label: "Tous",      count: stats.total },
    { key: "active",    label: "Actifs",    count: stats.active },
    { key: "pending",   label: "Attente",   count: stats.pending },
    { key: "suspended", label: "Suspendus", count: stats.suspended },
    { key: "banned",    label: "Bannis",    count: stats.banned },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <AdminTopNav
          title="Recrutement"
          subtitle="Agents PimPay"
          onRefresh={() => fetchAgents({ silent: true })}
          backPath="/admin"
        />

        {/* ── Stats strip ── */}
        <div className="flex gap-2 mb-6 mt-2">
          <StatCard label="Total" value={stats.total} icon={<Users size={14} />} color="text-white" />
          <StatCard label="Actifs" value={stats.active} icon={<UserCheck size={14} />} color="text-emerald-400" />
          <StatCard label="Attente" value={stats.pending} icon={<Clock size={14} />} color="text-amber-400" />
          <StatCard label="Suspendus" value={stats.suspended} icon={<ShieldOff size={14} />} color="text-orange-400" />
          <StatCard label="Bannis" value={stats.banned} icon={<Ban size={14} />} color="text-red-400" />
        </div>

        {/* ── Actions bar ── */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowPromoteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-wider transition-colors active:scale-95 shadow-lg shadow-blue-500/20"
          >
            <UserPlus size={14} /> Recruter
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-slate-400 text-[11px] font-bold hover:bg-white/[0.08] transition-colors active:scale-95"
          >
            <Download size={13} /> Export
          </button>
          <button
            onClick={() => fetchAgents({ silent: true })}
            disabled={refreshing}
            className="ml-auto p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:text-white transition-colors active:scale-95"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl mb-4">
          <Search size={14} className="text-slate-500 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par nom, email, ville…"
            className="flex-1 bg-transparent text-[12px] text-white placeholder-slate-600 outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-500 hover:text-slate-300">
              <XCircle size={14} />
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${activeTab === tab.key ? "bg-white/20" : "bg-white/5"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Sort bar ── */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{total} agents</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ArrowUpDown size={10} className="text-slate-600" />
            {(["createdAt", "name", "balance", "lastLogin"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                  sortKey === k ? "bg-white/10 text-white" : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {{ createdAt: "Date", name: "Nom", balance: "Solde", lastLogin: "Activité" }[k]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Agent list ── */}
        <div className="rounded-3xl border border-white/[0.06] bg-white/[0.01] overflow-hidden mb-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="text-blue-500 animate-spin" />
            </div>
          ) : sortedAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <Users size={32} className="mb-3 opacity-30" />
              <p className="text-[11px] font-bold uppercase tracking-wider">Aucun agent trouvé</p>
              <p className="text-[10px] mt-1 opacity-60">Modifiez votre recherche ou recrutez un premier agent</p>
            </div>
          ) : (
            <AnimatePresence>
              {sortedAgents.map((agent) => (
                <AgentRow key={agent.id} agent={agent} onAction={handleAction} onView={setSelectedAgent} />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-bold text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Processing overlay */}
        {processing && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-3 px-6 py-4 bg-[#0a1122] border border-white/10 rounded-2xl">
              <Loader2 size={18} className="text-blue-400 animate-spin" />
              <span className="text-[12px] font-bold text-white">Traitement en cours…</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showPromoteModal && (
          <PromoteModal onClose={() => setShowPromoteModal(false)} onPromote={handlePromote} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {actionModal && (
          <ActionModal
            agent={actionModal.agent}
            action={actionModal.action}
            onClose={() => setActionModal(null)}
            onConfirm={confirmAction}
          />
        )}
      </AnimatePresence>

      <AgentDrawer
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
        onAction={(agent, action) => { setSelectedAgent(null); handleAction(agent, action); }}
      />
    </div>
  );
}
