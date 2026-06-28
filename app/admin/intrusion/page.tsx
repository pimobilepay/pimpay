"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  Loader2, ShieldAlert, ShieldX, ShieldCheck, Radio, Search, X, Clock,
  MapPin, ChevronLeft, ChevronRight, Crosshair, Ban, Activity, Globe,
  AlertTriangle, Zap, Lock, Unlock, ShieldOff, Skull, Wifi, Server,
  Plus, SlidersHorizontal, Network, Eye, Bot, FileWarning,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

type ThreatLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type SecEvent = {
  id: string;
  level: string;
  source: string;
  action: string;
  message: string;
  details: any;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

type Threat = {
  ip: string;
  count: number;
  lastSeen: string;
  firstSeen: string;
  actions: string[];
  location: string | null;
  threat: ThreatLevel;
  blocked: boolean;
  blockedRecord: { reason: string | null; hits: number; expiresAt: string | null } | null;
};

type BlockedIp = {
  id: string;
  ip: string;
  reason: string | null;
  threat: string | null;
  blockedBy: string | null;
  active: boolean;
  hits: number;
  expiresAt: string | null;
  createdAt: string;
};

type DefenseSettings = {
  proxyDetectionEnabled: boolean;
  proxyDetectionMode: "BLOCK" | "MONITOR";
  blockVpn: boolean;
  blockProxy: boolean;
  blockTor: boolean;
  blockDatacenter: boolean;
  blockBots: boolean;
  blockHeaderSpoof: boolean;
  riskScoreThreshold: number;
  ipWhitelist: string;
  autoBlockOnDetection: boolean;
};

type ProxyDetectionRec = {
  id: string;
  ip: string;
  isProxy: boolean;
  isVpn: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  proxyType: string | null;
  riskScore: number;
  country: string | null;
  countryCode: string | null;
  isp: string | null;
  action: string;
  context: string | null;
  source: string;
  createdAt: string;
};

type Data = {
  events: SecEvent[];
  total: number;
  page: number;
  totalPages: number;
  threats: Threat[];
  blockedIps: BlockedIp[];
  settings: DefenseSettings;
  proxyDetections: ProxyDetectionRec[];
  stats: {
    events24h: number;
    uniqueSources: number;
    activeBlocks: number;
    critical: number;
    proxyDetected24h: number;
    proxyBlocked24h: number;
    vpnDetected: number;
    torDetected: number;
    datacenterDetected: number;
  };
};

const THREAT_STYLES: Record<ThreatLevel, { bg: string; text: string; ring: string; label: string }> = {
  LOW: { bg: "bg-slate-500/10", text: "text-slate-400", ring: "border-slate-500/20", label: "Faible" },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-400", ring: "border-amber-500/20", label: "Moyen" },
  HIGH: { bg: "bg-orange-500/10", text: "text-orange-400", ring: "border-orange-500/25", label: "Élevé" },
  CRITICAL: { bg: "bg-red-500/10", text: "text-red-400", ring: "border-red-500/30", label: "Critique" },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

// Valide une adresse IPv4 (ex. 203.0.113.45) ou IPv6 simplifiée.
function isValidIp(value: string): boolean {
  const ip = value.trim();
  if (!ip) return false;
  // IPv4 : 4 octets 0-255
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = ip.match(ipv4);
  if (m) {
    return m.slice(1).every((o) => Number(o) >= 0 && Number(o) <= 255 && String(Number(o)) === o);
  }
  // IPv6 : présence de ":" et caractères hexadécimaux valides
  const ipv6 = /^(([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{0,4}|::1|::)$/;
  return ipv6.test(ip);
}

function timeUntil(dateStr: string | null): string {
  if (!dateStr) return "permanent";
  const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 1000);
  if (diff <= 0) return "expiré";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

const DURATION_OPTIONS = [
  { label: "1 heure", minutes: 60 },
  { label: "24 heures", minutes: 1440 },
  { label: "7 jours", minutes: 10080 },
  { label: "Permanent", minutes: 0 },
];

export default function IntrusionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Data | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [live, setLive] = useState(true);
  const [tab, setTab] = useState<"threats" | "journal" | "proxy" | "blocked" | "protection">("threats");

  // Modal de riposte
  const [riposteTarget, setRiposteTarget] = useState<{ ip: string; threat: ThreatLevel } | null>(null);
  const [riposteReason, setRiposteReason] = useState("");
  const [riposteDuration, setRiposteDuration] = useState(1440);
  const [submitting, setSubmitting] = useState(false);

  // Blocage manuel d'IP
  const [manualIp, setManualIp] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [manualBlocking, setManualBlocking] = useState(false);

  // Réglages de protection (proxy / VPN)
  const [settings, setSettings] = useState<DefenseSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Liste blanche d'IP de confiance
  const [whitelistInput, setWhitelistInput] = useState("");
  const [whitelistAdding, setWhitelistAdding] = useState(false);

  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: "40" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/intrusion?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Erreur API");
      const json: Data = await res.json();

      if (!isFirstLoadRef.current && page === 1 && !search) {
        (json.events || []).forEach((e) => {
          if (!knownIdsRef.current.has(e.id)) {
            const isOverLimit = e.action === "WITHDRAWAL_LIMIT_EXCEEDED";
            toast(
              isOverLimit ? "Retrait au-dessus de la limite autorisée" : "Évènement de sécurité détecté",
              {
                description: e.message,
                duration: isOverLimit ? 8000 : 5000,
                style: {
                  background: isOverLimit ? "rgba(217, 119, 6, 0.97)" : "rgba(239, 68, 68, 0.95)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                },
              }
            );
          }
        });
      }
      knownIdsRef.current = new Set((json.events || []).map((e) => e.id));
      isFirstLoadRef.current = false;

      setData(json);
      // On hydrate les réglages une seule fois pour ne pas écraser les éditions en cours.
      setSettings((prev) => prev ?? json.settings);
    } catch {
      if (!silent) toast.error("Impossible de charger le journal d'intrusion");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => fetchData(true), 8000);
    return () => clearInterval(interval);
  }, [live, fetchData]);

  // Tentatives de retrait au-dessus de la limite autorisée (alerte dédiée).
  const overLimitEvents = useMemo(
    () => (data?.events || []).filter((e) => e.action === "WITHDRAWAL_LIMIT_EXCEEDED"),
    [data]
  );

  const openRiposte = (ip: string, threat: ThreatLevel) => {
    setRiposteTarget({ ip, threat });
    setRiposteReason("");
    setRiposteDuration(1440);
  };

  const handleBlock = async () => {
    if (!riposteTarget) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/intrusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "block",
          ip: riposteTarget.ip,
          threat: riposteTarget.threat,
          reason: riposteReason || "Activité malveillante détectée",
          durationMinutes: riposteDuration,
        }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success(`Riposte exécutée — IP ${riposteTarget.ip} bloquée`);
      setRiposteTarget(null);
      fetchData(true);
    } catch {
      toast.error("Échec de la riposte");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (ip: string) => {
    if (!confirm(`Lever le blocage sur l'IP ${ip} ?`)) return;
    try {
      const res = await fetch("/api/admin/intrusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblock", ip }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success(`Blocage levé sur ${ip}`);
      fetchData(true);
    } catch {
      toast.error("Échec du déblocage");
    }
  };

  const handleManualBlock = async () => {
    const ip = manualIp.trim();
    if (!ip) {
      toast.error("Saisissez une adresse IP dans le champ « Adresse IP »");
      return;
    }
    if (!isValidIp(ip)) {
      toast.error("Adresse IP invalide — format attendu : 203.0.113.45");
      return;
    }
    try {
      setManualBlocking(true);
      const res = await fetch("/api/admin/intrusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "block",
          ip,
          threat: "HIGH",
          reason: manualReason || "Blocage manuel par l'administrateur",
          durationMinutes: 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Erreur");
      toast.success(`IP ${ip} ajoutée à la liste noire`);
      setManualIp("");
      setManualReason("");
      setTab("blocked");
      fetchData(true);
    } catch (err: any) {
      toast.error(err?.message || "Échec du blocage de l'IP");
    } finally {
      setManualBlocking(false);
    }
  };

  const saveSettings = async (next: DefenseSettings) => {
    setSettings(next); // optimiste
    try {
      setSavingSettings(true);
      const res = await fetch("/api/admin/intrusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-settings", settings: next }),
      });
      if (!res.ok) throw new Error("Erreur");
      const json = await res.json();
      if (json.settings) setSettings(json.settings);
      toast.success("Protection mise à jour");
    } catch {
      toast.error("Échec de la mise à jour");
      fetchData(true);
    } finally {
      setSavingSettings(false);
    }
  };

  const updateSetting = <K extends keyof DefenseSettings>(key: K, value: DefenseSettings[K]) => {
    if (!settings) return;
    saveSettings({ ...settings, [key]: value });
  };

  const whitelistEntries = (settings?.ipWhitelist || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const mutateWhitelist = async (action: "whitelist-add" | "whitelist-remove", entry: string) => {
    try {
      if (action === "whitelist-add") setWhitelistAdding(true);
      const res = await fetch("/api/admin/intrusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, entry }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Échec de l'opération");
        return;
      }
      if (json.settings) setSettings(json.settings);
      toast.success(action === "whitelist-add" ? `${entry} ajoutée à la liste blanche` : `${entry} retirée de la liste blanche`);
      if (action === "whitelist-add") setWhitelistInput("");
    } catch {
      toast.error("Échec de l'opération");
    } finally {
      setWhitelistAdding(false);
    }
  };

  const handleWhitelistAdd = () => {
    const entry = whitelistInput.trim();
    if (!entry) {
      toast.error("Saisissez une adresse IP ou un CIDR");
      return;
    }
    mutateWhitelist("whitelist-add", entry);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
        <p className="text-red-500/50 text-[10px] font-black uppercase tracking-[5px]">Analyse en cours...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32" translate="no">
      <AdminTopNav title="Détection Intrusion" subtitle="Cybersécurité" onRefresh={fetchData} backPath="/admin" />

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-6">
        {/* LIVE STATUS */}
        <button
          onClick={() => setLive((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border w-full justify-center transition-all active:scale-[0.98] ${
            live ? "bg-red-500/10 border-red-500/25 text-red-400" : "bg-white/5 border-white/10 text-slate-500"
          }`}
        >
          <Radio size={13} className={live ? "animate-pulse" : ""} />
          <span className="text-[10px] font-black uppercase tracking-[2px]">
            {live ? "Surveillance temps réel active" : "Surveillance en pause"}
          </span>
          {live && <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />}
        </button>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Évènements (24h)" value={data?.stats.events24h ?? 0} icon={<ShieldAlert size={18} />} color="amber" />
          <StatCard label="Menaces critiques" value={data?.stats.critical ?? 0} icon={<Skull size={18} />} color="red" />
          <StatCard label="Sources uniques" value={data?.stats.uniqueSources ?? 0} icon={<Globe size={18} />} color="blue" />
          <StatCard label="IP bloquées" value={data?.stats.activeBlocks ?? 0} icon={<Ban size={18} />} color="rose" />
        </div>

        {/* ALERTE : tentatives de retrait au-dessus de la limite autorisée */}
        {overLimitEvents.length > 0 && (
          <button
            onClick={() => {
              setTab("journal");
              setSearchInput("WITHDRAWAL_LIMIT_EXCEEDED");
              setSearch("WITHDRAWAL_LIMIT_EXCEEDED");
              setPage(1);
            }}
            className="w-full text-left rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3.5 flex items-center gap-3 transition-all hover:bg-amber-500/[0.14] active:scale-[0.99]"
          >
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 flex-shrink-0">
              <AlertTriangle size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                {overLimitEvents.length} retrait{overLimitEvents.length > 1 ? "s" : ""} au-dessus de la limite
              </p>
              <p className="text-[9px] text-amber-200/70 truncate mt-0.5">
                {overLimitEvents[0].message}
              </p>
            </div>
            <ChevronRight size={16} className="text-amber-400/70 flex-shrink-0" />
          </button>
        )}

        {/* TABS */}
        <div className="flex gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "threats", label: "Menaces", icon: <Crosshair size={13} /> },
            { id: "journal", label: "Journal", icon: <Activity size={13} /> },
            { id: "proxy", label: "Proxy/VPN", icon: <Wifi size={13} /> },
            { id: "blocked", label: "Riposte", icon: <ShieldX size={13} /> },
            { id: "protection", label: "Protection", icon: <SlidersHorizontal size={13} /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                tab === t.id ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ===== MENACES (sources agrégées) ===== */}
        {tab === "threats" && (
          <section>
            <SectionTitle>Sources suspectes (7 jours)</SectionTitle>
            {data && data.threats.length > 0 ? (
              <div className="space-y-3">
                {data.threats.map((t) => {
                  const s = THREAT_STYLES[t.threat];
                  return (
                    <div key={t.ip} className={`rounded-3xl p-4 border ${s.bg} ${s.ring}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl ${s.bg} border ${s.ring} flex items-center justify-center flex-shrink-0`}>
                            <Globe size={16} className={s.text} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-black text-white truncate font-mono">{t.ip}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>
                                {s.label}
                              </span>
                              {t.location && <Meta icon={<MapPin size={9} />} text={t.location} />}
                            </div>
                          </div>
                        </div>
                        {t.blocked ? (
                          <span className="flex items-center gap-1.5 px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-2xl text-[9px] font-black uppercase tracking-wider text-red-400 flex-shrink-0">
                            <Lock size={12} /> Bloquée
                          </span>
                        ) : (
                          <button
                            onClick={() => openRiposte(t.ip, t.threat)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-2xl text-[9px] font-black uppercase tracking-wider text-red-400 hover:bg-red-600 hover:text-white transition-all active:scale-95 flex-shrink-0"
                          >
                            <Crosshair size={12} /> Riposter
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-white/5">
                        <Meta icon={<Zap size={10} />} text={`${t.count} évènements`} />
                        <Meta icon={<Clock size={10} />} text={`vu ${timeAgo(t.lastSeen)}`} />
                        <Meta icon={<Activity size={10} />} text={t.actions.join(", ")} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState text="Aucune source suspecte détectée" />
            )}
          </section>
        )}

        {/* ===== JOURNAL ===== */}
        {tab === "journal" && (
          <section>
            <SectionTitle>Journal des évènements</SectionTitle>
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPage(1);
                      setSearch(searchInput);
                    }
                  }}
                  placeholder="Rechercher (IP, action, message)..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-9 py-3 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-red-500/40"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {data && data.events.length > 0 ? (
              <div className="space-y-2">
                {data.events.map((e) => {
                  const critical = e.level === "ERROR" || e.level === "FATAL";
                  return (
                    <div
                      key={e.id}
                      className={`rounded-2xl px-4 py-3 border ${
                        critical ? "bg-red-500/[0.06] border-red-500/20" : "bg-white/[0.03] border-white/10"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${critical ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                          <ShieldAlert size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white leading-snug">{e.message}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{e.action}</span>
                            {e.ip && <Meta icon={<Globe size={9} />} text={e.ip} />}
                            <Meta icon={<Clock size={9} />} text={timeAgo(e.createdAt)} />
                          </div>
                        </div>
                        {e.ip && (
                          <button
                            onClick={() => openRiposte(e.ip!, critical ? "CRITICAL" : "HIGH")}
                            className="flex-shrink-0 p-2 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 hover:bg-red-600 hover:text-white transition-all active:scale-95"
                            title="Riposter (bloquer l'IP)"
                          >
                            <Crosshair size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState text="Aucun évènement enregistré" />
            )}

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-4 py-2.5 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-300 disabled:opacity-30 active:scale-95 transition-all"
                >
                  <ChevronLeft size={14} /> Préc
                </button>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  {page} / {data.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="flex items-center gap-1 px-4 py-2.5 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-300 disabled:opacity-30 active:scale-95 transition-all"
                >
                  Suiv <ChevronRight size={14} />
                </button>
              </div>
            )}
          </section>
        )}

        {/* ===== PROXY / VPN ===== */}
        {tab === "proxy" && (
          <section>
            {/* Bandeau d'état de la protection */}
            <div
              className={`flex items-center gap-3 rounded-3xl p-4 border mb-5 ${
                settings?.proxyDetectionEnabled
                  ? settings.proxyDetectionMode === "BLOCK"
                    ? "bg-emerald-500/10 border-emerald-500/25"
                    : "bg-amber-500/10 border-amber-500/25"
                  : "bg-white/[0.03] border-white/10"
              }`}
            >
              <div
                className={`p-2 rounded-xl ${
                  settings?.proxyDetectionEnabled
                    ? settings.proxyDetectionMode === "BLOCK"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-amber-500/15 text-amber-400"
                    : "bg-white/5 text-slate-500"
                }`}
              >
                {settings?.proxyDetectionEnabled ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-white uppercase tracking-wide">
                  {settings?.proxyDetectionEnabled
                    ? settings.proxyDetectionMode === "BLOCK"
                      ? "Protection active — blocage"
                      : "Protection active — surveillance"
                    : "Protection désactivée"}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  {settings?.proxyDetectionEnabled
                    ? settings.proxyDetectionMode === "BLOCK"
                      ? "Les connexions VPN/Proxy/Tor sont refusées"
                      : "Les connexions sont journalisées mais autorisées"
                    : "Aucune détection proxy/VPN en cours"}
                </p>
              </div>
              <button
                onClick={() => setTab("protection")}
                className="flex-shrink-0 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-slate-400"
                title="Réglages de protection"
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>

            {/* Stats proxy */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard label="Détections (24h)" value={data?.stats.proxyDetected24h ?? 0} icon={<Wifi size={18} />} color="blue" />
              <StatCard label="Bloquées (24h)" value={data?.stats.proxyBlocked24h ?? 0} icon={<ShieldX size={18} />} color="red" />
              <StatCard label="VPN (7j)" value={data?.stats.vpnDetected ?? 0} icon={<Network size={18} />} color="amber" />
              <StatCard label="Datacenter (7j)" value={data?.stats.datacenterDetected ?? 0} icon={<Server size={18} />} color="rose" />
            </div>

            <SectionTitle>Détections proxy / VPN / Tor</SectionTitle>
            {data && data.proxyDetections.length > 0 ? (
              <div className="space-y-2">
                {data.proxyDetections.map((d) => {
                  const enforced = d.action === "BLOCKED" || d.action === "AUTO_BLOCKED";
                  const tag = d.isTor ? "TOR" : d.isVpn ? "VPN" : d.isDatacenter ? "DATACENTER" : d.proxyType || "PROXY";
                  return (
                    <div
                      key={d.id}
                      className={`rounded-2xl px-4 py-3 border ${enforced ? "bg-red-500/[0.06] border-red-500/20" : "bg-amber-500/[0.05] border-amber-500/15"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${enforced ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                          {d.isTor ? <Eye size={12} /> : d.isVpn ? <Network size={12} /> : d.isDatacenter ? <Server size={12} /> : <Wifi size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-black text-white truncate font-mono">{d.ip}</p>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${enforced ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                              {tag}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                              {enforced ? "Bloqué" : "Détecté"}
                            </span>
                            <Meta icon={<Zap size={9} />} text={`risque ${d.riskScore}`} />
                            {d.context && <Meta icon={<Activity size={9} />} text={d.context} />}
                            {d.country && <Meta icon={<MapPin size={9} />} text={d.country} />}
                            <Meta icon={<Clock size={9} />} text={timeAgo(d.createdAt)} />
                          </div>
                          {d.isp && <p className="text-[9px] text-slate-600 mt-1 truncate">{d.isp}</p>}
                        </div>
                        <button
                          onClick={() => openRiposte(d.ip, d.riskScore >= 85 ? "CRITICAL" : "HIGH")}
                          className="flex-shrink-0 p-2 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 hover:bg-red-600 hover:text-white transition-all active:scale-95"
                          title="Bloquer cette IP"
                        >
                          <Crosshair size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState text="Aucune connexion proxy/VPN détectée" />
            )}
          </section>
        )}

        {/* ===== RIPOSTE / IP BLOQUÉES ===== */}
        {tab === "blocked" && (
          <section>
            {/* Blocage manuel d'une IP */}
            <div className="rounded-3xl p-4 border bg-white/[0.03] border-white/10 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-red-500/15 text-red-400">
                  <Ban size={14} />
                </div>
                <h3 className="text-[10px] font-black text-white uppercase tracking-[2px]">Bloquer une IP manuellement</h3>
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Adresse IP à bloquer</label>
                  <input
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !manualBlocking) handleManualBlock();
                    }}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="203.0.113.45"
                    className={`w-full bg-white/5 border rounded-2xl px-4 py-3 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-red-500/40 font-mono ${
                      manualIp.trim() && !isValidIp(manualIp) ? "border-red-500/50" : "border-white/10"
                    }`}
                  />
                  {manualIp.trim() && !isValidIp(manualIp) && (
                    <p className="text-[9px] text-red-400 mt-1.5">Format d&apos;adresse IP invalide</p>
                  )}
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Motif (optionnel)</label>
                  <input
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="Ex. tentatives de fraude répétées"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-red-500/40"
                  />
                </div>
                <button
                  onClick={handleManualBlock}
                  disabled={manualBlocking || !isValidIp(manualIp)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {manualBlocking ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Ajouter à la liste noire
                </button>
              </div>
            </div>

            <SectionTitle>IP bloquées ({data?.blockedIps.filter((b) => b.active).length ?? 0})</SectionTitle>
            {data && data.blockedIps.length > 0 ? (
              <div className="space-y-3">
                {data.blockedIps.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-3xl p-4 border ${b.active ? "bg-red-500/[0.06] border-red-500/20" : "bg-white/[0.02] border-white/10 opacity-60"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${b.active ? "bg-red-500/15 text-red-400" : "bg-white/5 text-slate-500"}`}>
                          {b.active ? <ShieldX size={16} /> : <ShieldOff size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-black text-white truncate font-mono">{b.ip}</p>
                          <p className="text-[9px] text-slate-500 truncate">{b.reason}</p>
                        </div>
                      </div>
                      {b.active && (
                        <button
                          onClick={() => handleUnblock(b.ip)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-[9px] font-black uppercase tracking-wider text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all active:scale-95 flex-shrink-0"
                        >
                          <Unlock size={12} /> Lever
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-white/5">
                      {b.threat && (
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${THREAT_STYLES[(b.threat as ThreatLevel)]?.bg || "bg-white/5"} ${THREAT_STYLES[(b.threat as ThreatLevel)]?.text || "text-slate-400"}`}>
                          {THREAT_STYLES[(b.threat as ThreatLevel)]?.label || b.threat}
                        </span>
                      )}
                      <Meta icon={<Clock size={10} />} text={b.active ? `expire dans ${timeUntil(b.expiresAt)}` : "inactif"} />
                      <Meta icon={<Zap size={10} />} text={`${b.hits} req. rejetées`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Aucune IP bloquée" />
            )}
          </section>
        )}

        {/* ===== PROTECTION (réglages défense proxy/VPN) ===== */}
        {tab === "protection" && (
          <section className="space-y-5">
            {!settings ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
              </div>
            ) : (
              <>
                {/* Interrupteur maître */}
                <div className={`rounded-3xl p-5 border ${settings.proxyDetectionEnabled ? "bg-emerald-500/[0.06] border-emerald-500/20" : "bg-white/[0.03] border-white/10"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-2xl ${settings.proxyDetectionEnabled ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-slate-500"}`}>
                        <ShieldCheck size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-black text-white uppercase tracking-wide">Protection Proxy / VPN</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Détection et blocage du trafic anonymisé</p>
                      </div>
                    </div>
                    <Toggle
                      on={settings.proxyDetectionEnabled}
                      disabled={savingSettings}
                      onClick={() => updateSetting("proxyDetectionEnabled", !settings.proxyDetectionEnabled)}
                    />
                  </div>
                </div>

                {/* Mode d'application */}
                <div className={`rounded-3xl p-4 border bg-white/[0.03] border-white/10 ${!settings.proxyDetectionEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Mode d&apos;application</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: "BLOCK", label: "Bloquer", icon: <Ban size={13} /> },
                      { id: "MONITOR", label: "Surveiller", icon: <Eye size={13} /> },
                    ] as const).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => updateSetting("proxyDetectionMode", m.id)}
                        className={`flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                          settings.proxyDetectionMode === m.id
                            ? "bg-red-600 border-red-600 text-white"
                            : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                        }`}
                      >
                        {m.icon}
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-600 mt-2.5 leading-relaxed">
                    {settings.proxyDetectionMode === "BLOCK"
                      ? "Les connexions détectées sont refusées (HTTP 403)."
                      : "Les connexions sont uniquement journalisées, sans blocage."}
                  </p>
                </div>

                {/* Catégories à bloquer */}
                <div className={`rounded-3xl border bg-white/[0.03] border-white/10 divide-y divide-white/5 ${!settings.proxyDetectionEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                  <SettingRow
                    icon={<Network size={15} />}
                    label="VPN"
                    desc="NordVPN, ExpressVPN, Surfshark…"
                    on={settings.blockVpn}
                    disabled={savingSettings}
                    onToggle={() => updateSetting("blockVpn", !settings.blockVpn)}
                  />
                  <SettingRow
                    icon={<Wifi size={15} />}
                    label="Proxy public"
                    desc="Proxies ouverts / anonymes"
                    on={settings.blockProxy}
                    disabled={savingSettings}
                    onToggle={() => updateSetting("blockProxy", !settings.blockProxy)}
                  />
                  <SettingRow
                    icon={<Eye size={15} />}
                    label="Réseau Tor"
                    desc="Nœuds de sortie Tor"
                    on={settings.blockTor}
                    disabled={savingSettings}
                    onToggle={() => updateSetting("blockTor", !settings.blockTor)}
                  />
                  <SettingRow
                    icon={<Server size={15} />}
                    label="Datacenter / Hébergeur"
                    desc="AWS, OVH, Hetzner… (peut bloquer des bots légitimes)"
                    on={settings.blockDatacenter}
                    disabled={savingSettings}
                    onToggle={() => updateSetting("blockDatacenter", !settings.blockDatacenter)}
                  />
                  <SettingRow
                    icon={<Bot size={15} />}
                    label="Bots & scrapers"
                    desc="curl, python-requests, headless, scanners (nmap, sqlmap…)"
                    on={settings.blockBots}
                    disabled={savingSettings}
                    onToggle={() => updateSetting("blockBots", !settings.blockBots)}
                  />
                  <SettingRow
                    icon={<FileWarning size={15} />}
                    label="En-têtes falsifiés"
                    desc="Chaînage de proxys anormal / en-têtes d'anonymisation"
                    on={settings.blockHeaderSpoof}
                    disabled={savingSettings}
                    onToggle={() => updateSetting("blockHeaderSpoof", !settings.blockHeaderSpoof)}
                  />
                </div>

                {/* Auto-blocage */}
                <div className={`rounded-3xl border bg-white/[0.03] border-white/10 ${!settings.proxyDetectionEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                  <SettingRow
                    icon={<Lock size={15} />}
                    label="Auto-blocage durable"
                    desc="Ajoute l'IP à la liste noire pendant 24h lors d'une détection"
                    on={settings.autoBlockOnDetection}
                    disabled={savingSettings}
                    onToggle={() => updateSetting("autoBlockOnDetection", !settings.autoBlockOnDetection)}
                  />
                </div>

                {/* Seuil de risque */}
                <div className={`rounded-3xl p-4 border bg-white/[0.03] border-white/10 ${!settings.proxyDetectionEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Seuil de risque</label>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const v = settings.riskScoreThreshold;
                        const tag = v <= 30
                          ? { label: "Verrouillage total", cls: "bg-red-600/25 text-red-300" }
                          : v < 50
                          ? { label: "Agressif", cls: "bg-red-500/15 text-red-400" }
                          : v < 70
                          ? { label: "Strict", cls: "bg-orange-500/15 text-orange-400" }
                          : v <= 85
                          ? { label: "Équilibré", cls: "bg-emerald-500/15 text-emerald-400" }
                          : { label: "Permissif", cls: "bg-slate-500/15 text-slate-400" };
                        return <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${tag.cls}`}>{tag.label}</span>;
                      })()}
                      <span className="text-[12px] font-black text-white font-mono">{settings.riskScoreThreshold}</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={settings.riskScoreThreshold}
                    onChange={(e) => setSettings({ ...settings, riskScoreThreshold: Number(e.target.value) })}
                    onMouseUp={(e) => updateSetting("riskScoreThreshold", Number((e.target as HTMLInputElement).value))}
                    onTouchEnd={(e) => updateSetting("riskScoreThreshold", Number((e.target as HTMLInputElement).value))}
                    className="w-full accent-red-600"
                  />
                  <p className="text-[9px] text-slate-600 mt-2 leading-relaxed">
                    Score (0-100) au-delà duquel une IP VPN/proxy est bloquée. À{" "}
                    <span className="text-red-400 font-bold">30 ou moins</span>, le verrouillage total
                    s&apos;active : tout accès est bloqué (sauf liste blanche). Un seuil trop bas
                    (&lt; 50) bloque des adresses normales sans réelle menace.{" "}
                    <span className="text-emerald-400/80 font-bold">Recommandé : 75.</span>
                  </p>
                  {settings.riskScoreThreshold <= 30 ? (
                    <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-red-600/15 border border-red-500/30 p-2.5">
                      <ShieldX size={13} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-[9px] text-red-300/90 leading-relaxed">
                        <span className="font-black uppercase tracking-wide">Verrouillage total actif.</span>{" "}
                        En mode « Bloquer », tout le trafic entrant (connexion, transferts) est refusé
                        (HTTP 403), à l&apos;exception des IP de la liste blanche. Remontez le seuil pour
                        rétablir l&apos;accès.
                      </p>
                    </div>
                  ) : settings.riskScoreThreshold < 50 && (
                    <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5">
                      <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-[9px] text-amber-300/90 leading-relaxed">
                        Seuil très bas : risque élevé de faux positifs. De nombreuses IP légitimes
                        seront bloquées. Remontez-le à 75 pour un équilibre sûr.
                      </p>
                    </div>
                  )}
                </div>

                {/* Liste blanche */}
                <div className="rounded-3xl p-4 border bg-emerald-500/[0.04] border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                      <ShieldCheck size={14} />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[2px]">Liste blanche</h3>
                      <p className="text-[9px] text-slate-500 mt-0.5">IP / CIDR de confiance — contournent toute la détection</p>
                    </div>
                  </div>

                  {/* Champ d'ajout */}
                  <div className="flex gap-2">
                    <input
                      value={whitelistInput}
                      onChange={(e) => setWhitelistInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleWhitelistAdd();
                      }}
                      placeholder="203.0.113.10 ou 198.51.100.0/24"
                      className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/40 font-mono"
                    />
                    <button
                      onClick={handleWhitelistAdd}
                      disabled={whitelistAdding}
                      className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-[0.97] disabled:opacity-50"
                    >
                      {whitelistAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Ajouter
                    </button>
                  </div>

                  {/* Liste des entrées */}
                  {whitelistEntries.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {whitelistEntries.map((entry) => (
                        <li
                          key={entry}
                          className="flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-2xl pl-4 pr-2 py-2.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ShieldCheck size={12} className="text-emerald-400 flex-shrink-0" />
                            <span className="text-[11px] font-mono text-white truncate">{entry}</span>
                          </div>
                          <button
                            onClick={() => mutateWhitelist("whitelist-remove", entry)}
                            className="flex-shrink-0 p-2 bg-white/5 rounded-xl text-slate-400 hover:bg-red-600 hover:text-white transition-all active:scale-95"
                            title="Retirer de la liste blanche"
                          >
                            <X size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[9px] text-slate-600 mt-3 leading-relaxed">
                      Aucune adresse de confiance. Ajoutez vos IP fixes (bureau, VPN d&apos;entreprise���) pour qu&apos;elles ne soient jamais bloquées.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {/* MODAL RIPOSTE */}
      {riposteTarget && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setRiposteTarget(null)}>
          <div
            className="w-full max-w-md bg-[#0a0f1a] border border-red-500/20 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-red-500/[0.06]">
              <div className="p-2 rounded-xl bg-red-500/15 text-red-400">
                <Crosshair size={18} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wide">Riposte défensive</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5 font-mono">{riposteTarget.ip}</p>
              </div>
              <button onClick={() => setRiposteTarget(null)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-2xl bg-amber-500/[0.06] border border-amber-500/15">
                <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-amber-200/70 leading-relaxed">
                  La riposte bloque le <span className="font-bold">trafic entrant</span> de cette adresse (défense active). Aucune action offensive n&apos;est exécutée.
                </p>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Motif</label>
                <input
                  value={riposteReason}
                  onChange={(e) => setRiposteReason(e.target.value)}
                  placeholder="Brute force, scan de vulnérabilité..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-red-500/40"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Durée du blocage</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.minutes}
                      onClick={() => setRiposteDuration(opt.minutes)}
                      className={`py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                        riposteDuration === opt.minutes
                          ? "bg-red-600 border-red-600 text-white"
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleBlock}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-600 hover:bg-red-500 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Exécuter la riposte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[10px] font-black text-red-500 uppercase tracking-[3px] mb-4">{children}</h2>;
}

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      role="switch"
      aria-checked={on}
      className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-all disabled:opacity-50 ${on ? "bg-emerald-500" : "bg-white/10"}`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function SettingRow({
  icon, label, desc, on, onToggle, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-xl flex-shrink-0 ${on ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-slate-500"}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black text-white">{label}</p>
          <p className="text-[9px] text-slate-500 truncate">{desc}</p>
        </div>
      </div>
      <Toggle on={on} onClick={onToggle} disabled={disabled} />
    </div>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 min-w-0">
      <span className="text-slate-600 flex-shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 bg-white/[0.02] border border-white/5 rounded-3xl">
      <ShieldCheck size={28} className="text-slate-700 mb-3" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">{text}</p>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  };
  return (
    <div className={`border rounded-3xl p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-xl bg-white/5">{icon}</div>
        <span className="text-2xl font-black tracking-tighter text-white">{value}</span>
      </div>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</p>
    </div>
  );
}
