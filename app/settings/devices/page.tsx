"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft, Smartphone, History, LogOut, ShieldCheck,
  Globe, Cpu, AlertTriangle, ChevronRight, X, MapPin
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  deviceName?: string;
  os?: string;
  browser?: string;
  ip?: string;
  country?: string;
  city?: string;
  lat?: number;
  lon?: number;
  lastActiveAt?: string;
  isActive?: boolean;
  isCurrent?: boolean;
}

export default function DevicesPage() {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [active, setActive] = useState<Session[]>([]);
  const [history, setHistory] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const fetchSessions = async () => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("pimpay_token");
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      const res = await fetch("/api/auth/session", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActive(data.active || []);
      setHistory(data.history || []);
    } catch (err) {
      toast.error("Erreur de synchronisation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const logoutDevice = async (id: string) => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("pimpay_token");
    try {
      const res = await fetch(`/api/auth/devices/${id}/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Session terminée");
      setActive((prev) => prev.filter((d) => d.id !== id));
      setSelectedSession(null);
    } catch {
      toast.error("Erreur de déconnexion");
    }
  };

  const logoutAllOtherDevices = async () => {
    if (!confirm("Déconnecter tous les autres appareils ?")) return;
    
    const token = localStorage.getItem("adminToken") || localStorage.getItem("pimpay_token");
    try {
      const res = await fetch("/api/auth/session/logout-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error();
      
      toast.success("Toutes les autres sessions ont été fermées");
      fetchSessions(); // Rafraîchir la liste
    } catch (err) {
      toast.error("Erreur lors de la déconnexion globale");
    }
  };

  const list = tab === "active" ? active : history;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Sécurisation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 pb-24">
      {/* Header FinTech */}
      <div className="relative overflow-hidden bg-slate-900/50 border-b border-slate-800 px-6 pt-12 pb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10" />
        <div className="flex items-center justify-between mb-6">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="rounded-full bg-slate-800/50 hover:bg-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-1 px-3">
            <ShieldCheck className="w-3 h-3 mr-1.5" /> Sécurité Active
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Appareils</h1>
        <div className="flex p-1 bg-slate-950/50 rounded-xl border border-slate-800 mt-8">
          <button onClick={() => setTab("active")} className={cn("flex-1 py-2.5 text-sm font-medium transition-all rounded-lg", tab === "active" ? "bg-primary shadow-lg text-white" : "text-slate-400")}>Actifs ({active.length})</button>
          <button onClick={() => setTab("history")} className={cn("flex-1 py-2.5 text-sm font-medium transition-all rounded-lg", tab === "history" ? "bg-primary shadow-lg text-white" : "text-slate-400")}>Historique</button>
        </div>
      </div>

      <div className="px-6 py-8 space-y-4">
        {/* Warning Feature lié à logoutAllOtherDevices */}
        {tab === "active" && active.length > 1 && (
          <Card className="bg-amber-500/5 border-amber-500/20 p-4 flex gap-4 items-start">
            <AlertTriangle className="text-amber-500 w-5 h-5 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="text-sm text-amber-200/80 leading-relaxed">
                Plusieurs sessions sont actives. Si vous ne reconnaissez pas un appareil, déconnectez-le immédiatement.
              </p>
              <button
                onClick={logoutAllOtherDevices}
                className="text-xs font-bold text-amber-500 uppercase tracking-wider hover:underline"
              >
                Tout déconnecter sauf cet appareil
              </button>
            </div>
          </Card>
        )}

        {list.map((s) => (
          <Card
            key={s.id}
            onClick={() => setSelectedSession(s)}
            className="bg-slate-900/40 border-slate-800/60 p-5 hover:border-primary/50 transition-all group relative overflow-hidden cursor-pointer"
          >
            {s.isCurrent && (
              <div className="absolute top-0 right-0 bg-primary/20 text-primary text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">
                Cet appareil
              </div>
            )}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                {s.os?.toLowerCase().includes("ios") || s.os?.toLowerCase().includes("android") ? <Smartphone className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-100 truncate">{s.deviceName || s.browser || "Appareil Inconnu"}</h3>
                <p className="text-xs text-slate-500 mt-1">{s.os} • {s.ip}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-slate-800 text-slate-400 text-[10px]">{s.city || s.country || "Localisation..."}</Badge>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-700 mt-3" />
            </div>
          </Card>
        ))}
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedSession(null)} />
          <Card className="relative w-full max-w-md bg-slate-950 border-slate-800 rounded-3xl overflow-hidden animate-in slide-in-from-bottom-20">
            <div className="h-40 bg-slate-900 relative">
               <iframe
                width="100%" height="100%" frameBorder="0"
                style={{ filter: 'invert(90%) hue-rotate(180deg) contrast(90%)' }}
                src={`https://maps.google.com/maps?q=${selectedSession.lat},${selectedSession.lon}&z=12&output=embed`}
              />
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-black/50 text-white rounded-full" onClick={() => setSelectedSession(null)}><X size={16}/></Button>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-1">{selectedSession.deviceName || selectedSession.browser}</h2>
              <p className="text-slate-500 text-sm flex items-center mb-6"><MapPin size={14} className="mr-1"/> {selectedSession.city}, {selectedSession.country}</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">IP Adress</p>
                  <p className="text-xs font-mono">{selectedSession.ip}</p>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Dernière activité</p>
                  <p className="text-xs">{selectedSession.lastActiveAt ? new Date(selectedSession.lastActiveAt).toLocaleDateString() : 'Inconnue'}</p>
                </div>
              </div>

              {!selectedSession.isCurrent && tab === "active" && (
                <Button variant="destructive" className="w-full py-6 rounded-2xl" onClick={() => logoutDevice(selectedSession.id)}>
                  Déconnecter cet appareil
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
