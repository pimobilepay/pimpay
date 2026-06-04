"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  X, Loader2, Unlock, Lock, ShieldAlert, ShieldCheck, User, Mail, Phone,
  MapPin, Globe, Briefcase, Calendar, Wallet, Activity, Clock, Smartphone,
  CreditCard, Users2, BadgeCheck, AlertTriangle, KeyRound, Fingerprint,
} from "lucide-react";

type Session = {
  id: string;
  ip: string | null;
  deviceName: string | null;
  browser: string | null;
  city: string | null;
  country: string | null;
  lastActiveAt: string;
  createdAt: string;
};

type RecentAttempt = {
  id: string;
  action: string;
  message: string;
  ip: string | null;
  createdAt: string;
};

type UserDetail = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  nationality: string | null;
  gender: string | null;
  birthDate: string | null;
  occupation: string | null;
  role: string;
  status: string;
  statusReason: string | null;
  kycStatus: string;
  autoApprove: boolean;
  twoFactorEnabled: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  createdAt: string;
  idType: string | null;
  idNumber: string | null;
  idCountry: string | null;
  kycSubmittedAt: string | null;
  kycVerifiedAt: string | null;
  kycReason: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  pinUpdatedAt: string | null;
  referralCode: string | null;
  isLocked: boolean;
  wallets: { currency: string; balance: number; frozenBalance: number; type: string }[];
  sessions: Session[];
  _count: {
    transactionsFrom: number;
    transactionsTo: number;
    referrals: number;
    notifications: number;
    sessions: number;
  };
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDay(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function timeAgo(d: string): string {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

function displayName(u: { name: string | null; firstName: string | null; lastName: string | null; username: string | null; email: string | null }): string {
  if (u.name) return u.name;
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return full || u.username || u.email || "Utilisateur";
}

export function UserSecurityDetailModal({
  userId,
  maxAttempts,
  onClose,
  onUnlocked,
}: {
  userId: string;
  maxAttempts: number;
  onClose: () => void;
  onUnlocked?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ user: UserDetail; recentAttempts: RecentAttempt[] } | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/login-attempts/user?userId=${userId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Erreur");
        const json = await res.json();
        if (active) setData(json);
      } catch {
        toast.error("Impossible de charger les details de l'utilisateur");
        onClose();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId, onClose]);

  const handleUnlock = async () => {
    if (!data) return;
    try {
      setUnlocking(true);
      const res = await fetch("/api/admin/login-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Compte deverrouille");
      setData((prev) => prev ? { ...prev, user: { ...prev.user, isLocked: false, lockedUntil: null, failedLoginAttempts: 0 } } : prev);
      onUnlocked?.();
    } catch {
      toast.error("Echec du deverrouillage");
    } finally {
      setUnlocking(false);
    }
  };

  const u = data?.user;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" translate="no">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg max-h-[92vh] bg-[#0a0f1d] border-t sm:border border-white/10 rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-blue-400" />
            <h3 className="text-[11px] font-black uppercase tracking-[2px] text-white">Detail utilisateur</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-90">
            <X size={16} />
          </button>
        </div>

        {loading || !u ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 size={32} className="text-blue-500 animate-spin mb-3" />
            <p className="text-[10px] font-black uppercase tracking-[3px] text-blue-500/50">Chargement...</p>
          </div>
        ) : (
          <div className="overflow-y-auto px-5 py-5 space-y-6">
            {/* IDENTITÉ */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {u.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar || "/placeholder.svg"} alt={displayName(u)} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-white">{displayName(u).charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-white truncate">{displayName(u)}</p>
                <p className="text-[11px] text-slate-500 truncate">@{u.username || "—"}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Badge color={u.isLocked ? "red" : u.status === "ACTIVE" ? "emerald" : "amber"}>
                    {u.isLocked ? "Verrouille" : u.status}
                  </Badge>
                  <Badge color="slate">{u.role}</Badge>
                  <Badge color={u.kycStatus === "VERIFIED" ? "emerald" : "amber"}>KYC {u.kycStatus}</Badge>
                </div>
              </div>
            </div>

            {/* ALERTE SÉCURITÉ + DÉVERROUILLAGE */}
            <div className={`rounded-2xl p-4 border ${u.isLocked ? "bg-red-500/[0.07] border-red-500/25" : "bg-white/[0.03] border-white/10"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${u.isLocked ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {u.isLocked ? <Lock size={16} /> : <Activity size={16} />}
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-white">
                      {u.failedLoginAttempts}/{maxAttempts} tentatives echouees
                    </p>
                    <p className="text-[9px] text-slate-500">
                      {u.isLocked ? `Verrouille jusqu'au ${fmtDate(u.lockedUntil)}` : "Compte non verrouille"}
                    </p>
                  </div>
                </div>
                {u.isLocked && (
                  <button
                    onClick={handleUnlock}
                    disabled={unlocking}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-[9px] font-black uppercase tracking-wider text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                  >
                    {unlocking ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
                    Debloquer
                  </button>
                )}
              </div>
            </div>

            {/* INFOS SÉCURITÉ */}
            <Section title="Securite" icon={<KeyRound size={12} />}>
              <Row icon={<Clock size={12} />} label="Derniere connexion" value={u.lastLoginAt ? `${fmtDate(u.lastLoginAt)}` : "Jamais"} />
              <Row icon={<MapPin size={12} />} label="Derniere IP" value={u.lastLoginIp || "—"} />
              <Row icon={<Fingerprint size={12} />} label="2FA" value={u.twoFactorEnabled ? "Active" : "Desactive"} />
              <Row icon={<KeyRound size={12} />} label="PIN modifie le" value={fmtDay(u.pinUpdatedAt)} />
            </Section>

            {/* SESSIONS ACTIVES */}
            {u.sessions.length > 0 && (
              <Section title={`Sessions actives (${u._count.sessions})`} icon={<Smartphone size={12} />}>
                <div className="space-y-2">
                  {u.sessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5">
                      <Smartphone size={13} className="text-slate-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-white truncate">{s.deviceName || s.browser || "Appareil inconnu"}</p>
                        <p className="text-[9px] text-slate-500 truncate">
                          {[s.city, s.country].filter(Boolean).join(", ") || "Lieu inconnu"} · {s.ip || "—"}
                        </p>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 flex-shrink-0">{timeAgo(s.lastActiveAt)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* TENTATIVES RÉCENTES */}
            {data && data.recentAttempts.length > 0 && (
              <Section title="Activite de connexion recente" icon={<Activity size={12} />}>
                <div className="space-y-2">
                  {data.recentAttempts.map((a) => {
                    const isFail = a.action === "FAILED_LOGIN" || a.action === "ACCOUNT_LOCKED";
                    return (
                      <div key={a.id} className="flex items-start gap-2.5 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5">
                        <div className={`mt-0.5 p-1 rounded-md flex-shrink-0 ${isFail ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                          {isFail ? <ShieldAlert size={11} /> : <ShieldCheck size={11} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-white leading-snug">{a.message}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{a.ip || "—"} · {timeAgo(a.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* IDENTITÉ / PROFIL */}
            <Section title="Profil" icon={<User size={12} />}>
              <Row icon={<Mail size={12} />} label="Email" value={u.email || "—"} />
              <Row icon={<Phone size={12} />} label="Telephone" value={u.phone || "—"} />
              <Row icon={<Globe size={12} />} label="Nationalite" value={u.nationality || "—"} />
              <Row icon={<MapPin size={12} />} label="Localisation" value={[u.city, u.country].filter(Boolean).join(", ") || "—"} />
              <Row icon={<Briefcase size={12} />} label="Profession" value={u.occupation || "—"} />
              <Row icon={<Calendar size={12} />} label="Naissance" value={fmtDay(u.birthDate)} />
              <Row icon={<Calendar size={12} />} label="Inscrit le" value={fmtDay(u.createdAt)} />
            </Section>

            {/* KYC */}
            <Section title="Verification KYC" icon={<BadgeCheck size={12} />}>
              <Row icon={<CreditCard size={12} />} label="Type de piece" value={u.idType || "—"} />
              <Row icon={<CreditCard size={12} />} label="N. de piece" value={u.idNumber || "—"} />
              <Row icon={<Globe size={12} />} label="Pays d'emission" value={u.idCountry || "—"} />
              <Row icon={<Clock size={12} />} label="Soumis le" value={fmtDay(u.kycSubmittedAt)} />
              <Row icon={<BadgeCheck size={12} />} label="Verifie le" value={fmtDay(u.kycVerifiedAt)} />
              {u.kycReason && <Row icon={<AlertTriangle size={12} />} label="Motif" value={u.kycReason} />}
            </Section>

            {/* PORTEFEUILLES */}
            {u.wallets.length > 0 && (
              <Section title="Portefeuilles" icon={<Wallet size={12} />}>
                <div className="space-y-2">
                  {u.wallets.map((w, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5">
                      <span className="text-[10px] font-black text-white">{w.currency}</span>
                      <div className="text-right">
                        <p className="text-[11px] font-black text-white">{w.balance.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</p>
                        {w.frozenBalance > 0 && (
                          <p className="text-[8px] text-amber-400">Gele: {w.frozenBalance.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* STATISTIQUES */}
            <Section title="Activite" icon={<Activity size={12} />}>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat icon={<Activity size={13} />} label="Transactions" value={u._count.transactionsFrom + u._count.transactionsTo} />
                <MiniStat icon={<Users2 size={13} />} label="Filleuls" value={u._count.referrals} />
                <MiniStat icon={<Smartphone size={13} />} label="Sessions" value={u._count.sessions} />
                <MiniStat icon={<ShieldAlert size={13} />} label="Notifications" value={u._count.notifications} />
              </div>
            </Section>

            {/* LIMITES */}
            <Section title="Limites" icon={<CreditCard size={12} />}>
              <Row icon={<CreditCard size={12} />} label="Limite quotidienne" value={u.dailyLimit.toLocaleString("fr-FR")} />
              <Row icon={<CreditCard size={12} />} label="Limite mensuelle" value={u.monthlyLimit.toLocaleString("fr-FR")} />
              <Row icon={<BadgeCheck size={12} />} label="Auto-approbation" value={u.autoApprove ? "Oui" : "Non"} />
              <Row icon={<Users2 size={12} />} label="Code parrainage" value={u.referralCode || "—"} />
            </Section>

            <div className="h-2" />
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-blue-500">{icon}</span>
        <h4 className="text-[9px] font-black uppercase tracking-[2px] text-blue-500">{title}</h4>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="flex items-center gap-2 text-[10px] font-bold text-slate-500 flex-shrink-0">
        <span className="text-slate-600">{icon}</span>
        {label}
      </span>
      <span className="text-[10px] font-bold text-white text-right truncate">{value}</span>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-500 mb-1">{icon}</div>
      <p className="text-base font-black text-white tracking-tighter">{value}</p>
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</p>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    red: "bg-red-500/15 text-red-400 border-red-500/25",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    slate: "bg-white/5 text-slate-300 border-white/10",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
}
