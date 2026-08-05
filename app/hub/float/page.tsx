"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { AgentSidebar } from "@/components/hub/AgentSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  DollarSign,
  PiggyBank,
  Menu,
  X,
  Clock,
  Loader2,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  XCircle,
  Ban,
} from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Erreur de chargement");
  return json;
};

const USD_RATE = 600; // 1 USD ~ 600 XAF (indicatif)
const FLOAT_CURRENCIES = ["XAF", "XOF", "PI"] as const;
type FloatCurrency = (typeof FLOAT_CURRENCIES)[number];

interface FloatMovement {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "REJECTED" | "CANCELLED";
  note: string | null;
  description: string | null;
  createdAt: string;
  source: string;
  decidedByName?: string | null;
  decidedAt?: string | null;
  rejectReason?: string | null;
}

interface FloatPayload {
  wallets: { currency: string; balance: number }[];
  requests: FloatMovement[];
  pendingTotal: number;
}

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AgentFloatPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<FloatCurrency>("XAF");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Solde / sante de liquidite issus du tableau de bord agent
  const { data: dashboard, isLoading: dashLoading, mutate: mutateDashboard } =
    useSWR("/api/agent/dashboard", fetcher);

  // Historique reel des provisionnements et demandes de float
  const {
    data: floatData,
    isLoading: floatLoading,
    mutate: mutateFloat,
    error: floatError,
  } = useSWR<FloatPayload>("/api/agent/float", fetcher, { refreshInterval: 20000 });

  const isLoading = dashLoading || floatLoading;

  const wallets = floatData?.wallets ?? [];
  // Le float de caisse fait foi cote API float, avec repli sur le dashboard.
  const floatBalance =
    wallets.find((w) => w.currency === "XAF")?.balance ?? dashboard?.floatBalance ?? 0;
  const floatUsd = Math.round((floatBalance / USD_RATE) * 100) / 100;
  const liquidityHealth = dashboard?.liquidityHealth || 0;
  const dailyVolume = dashboard?.dailyVolume || 0;

  const requests = floatData?.requests ?? [];
  const pendingTotal = floatData?.pendingTotal ?? 0;
  const hasPendingForCurrency = useMemo(
    () => requests.some((r) => r.status === "PENDING" && r.currency === currency),
    [requests, currency]
  );

  const healthStatus = useMemo(() => {
    if (liquidityHealth >= 80)
      return { label: "Excellent", color: "text-emerald-500", bg: "bg-emerald-500" };
    if (liquidityHealth >= 50)
      return { label: "Moyen", color: "text-amber-500", bg: "bg-amber-500" };
    return { label: "Critique", color: "text-red-500", bg: "bg-red-500" };
  }, [liquidityHealth]);

  const refreshAll = () => {
    mutateFloat();
    mutateDashboard();
  };

  const handleSubmitRecharge = async () => {
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Montant invalide");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/agent/float", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, currency, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Envoi impossible");

      await mutateFloat();
      setSuccess(true);
      setAmount("");
      setNote("");
      toast.success(`Demande de ${fmt(value)} ${currency} envoyee a l'administration`);
      setTimeout(() => {
        setSuccess(false);
        setDialogOpen(false);
      }, 1600);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      const res = await fetch(`/api/agent/float?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Annulation impossible");
      await mutateFloat();
      toast.success("Demande annulee");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'annulation");
    } finally {
      setCancelling(null);
    }
  };

  const statusBadge = (status: FloatMovement["status"]) => {
    if (status === "SUCCESS")
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Credite
        </Badge>
      );
    if (status === "REJECTED")
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Refuse
        </Badge>
      );
    if (status === "CANCELLED")
      return (
        <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">
          <Ban className="h-3 w-3 mr-1" />
          Annule
        </Badge>
      );
    return (
      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
        <Clock className="h-3 w-3 mr-1" />
        En attente
      </Badge>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AgentSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center justify-center flex-1">
                <div>
                  <h1 className="text-sm font-black text-white text-center">PIMOBIPAY</h1>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase text-center">Agent Hub</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400" aria-label="Fermer le menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <AgentSidebar isMobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Mobile Header */}
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl bg-white/5 text-slate-400" aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-black text-white">PIMOBIPAY</h1>
          <div className="w-9" />
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Float &amp; Liquidite</h1>
            <p className="text-sm text-slate-500 mt-1">Gerez votre cash float pour servir vos clients</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setDialogOpen(true)}
            >
              <PiggyBank className="h-4 w-4 mr-2" />
              Demande de rechargement
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-white/10 bg-slate-900/50"
              onClick={refreshAll}
              disabled={isLoading}
              aria-label="Rafraichir"
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {floatError && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs font-medium text-red-300">
              Impossible de charger vos mouvements de float. Reessayez dans un instant.
            </p>
          </div>
        )}

        {/* Cash Float Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-500/30 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-300/70 uppercase tracking-wider">Cash Float (FCFA)</p>
                  {isLoading ? (
                    <Skeleton className="h-10 w-40 mt-2 bg-emerald-500/20" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-2">{fmt(floatBalance)} XAF</p>
                  )}
                  <p className="text-xs text-emerald-300/60 mt-1">Disponible pour depots / retraits</p>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                  <Wallet className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-300/70 uppercase tracking-wider">Equivalent USD</p>
                  {isLoading ? (
                    <Skeleton className="h-10 w-40 mt-2 bg-blue-500/20" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-2">
                      {floatUsd.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} USD
                    </p>
                  )}
                  <p className="text-xs text-blue-300/60 mt-1">Taux indicatif ~{USD_RATE} XAF / USD</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-2xl">
                  <DollarSign className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending banner */}
        {pendingTotal > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs font-medium text-amber-200/90">
              {fmt(pendingTotal)} en attente de validation par l&apos;administration PIMOBIPAY.
            </p>
          </div>
        )}

        {/* Health + Volume */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sante Liquidite</p>
                  <div className="flex items-center gap-2 mt-2">
                    {isLoading ? (
                      <Skeleton className="h-8 w-20 bg-slate-700" />
                    ) : (
                      <>
                        <p className={`text-2xl font-black ${healthStatus.color}`}>{liquidityHealth}%</p>
                        <Badge className={`${healthStatus.bg}/10 ${healthStatus.color} border-none`}>
                          {healthStatus.label}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-slate-800 rounded-2xl">
                  {liquidityHealth >= 80 ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <AlertCircle className={`h-6 w-6 ${liquidityHealth >= 50 ? "text-amber-500" : "text-red-500"}`} />
                  )}
                </div>
              </div>
              <Progress value={liquidityHealth} className="h-2" />
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Volume Journalier</p>
                  {isLoading ? (
                    <Skeleton className="h-10 w-32 mt-2 bg-slate-700" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-2">{fmt(dailyVolume)} XAF</p>
                  )}
                </div>
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recharge History */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-500" />
              Mouvements de float
              {requests.length > 0 && (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ml-1">
                  {requests.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-slate-500">
              Vos demandes et provisionnements valides par l&apos;admin PIMOBIPAY
            </CardDescription>
          </CardHeader>
          <CardContent>
            {floatLoading && requests.length === 0 ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-800/60" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-10">
                <PiggyBank className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Aucun mouvement de float</p>
                <p className="text-slate-600 text-sm mt-1">
                  Cliquez sur &quot;Demande de rechargement&quot; pour approvisionner votre float
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => {
                  const isAdminDirect = req.source === "ADMIN_DIRECT";
                  const isDebit = req.source === "ADMIN_DEBIT";
                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50"
                    >
                      <div
                        className={`p-2.5 rounded-xl ${
                          isDebit ? "bg-amber-500/10" : "bg-emerald-500/10"
                        }`}
                      >
                        {isDebit ? (
                          <ArrowUpRight className="h-5 w-5 text-amber-500" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold">
                          {fmt(req.amount)} {req.currency}
                        </p>
                        <p className="text-xs text-slate-500">
                          {req.reference} · {dateFmt(req.createdAt)}
                        </p>
                        {isAdminDirect && (
                          <p className="text-[11px] text-emerald-400/80 mt-1">
                            Provision directe{req.decidedByName ? ` · ${req.decidedByName}` : ""}
                          </p>
                        )}
                        {req.rejectReason && (
                          <p className="text-[11px] text-red-400/80 mt-1">{req.rejectReason}</p>
                        )}
                        {!req.rejectReason && req.note && (
                          <p className="text-xs text-slate-400 mt-1 truncate">{req.note}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {statusBadge(req.status)}
                        {req.status === "PENDING" && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            disabled={cancelling === req.id}
                            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            {cancelling === req.id ? "..." : "Annuler"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Recharge Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-emerald-500" />
              Demande de rechargement Float
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Votre demande sera envoyee a l&apos;administrateur PIMOBIPAY pour validation.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="font-bold text-white">Demande envoyee !</p>
              <p className="text-sm text-slate-400 text-center">
                Vous serez notifie des que l&apos;admin aura traite votre demande.
              </p>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-400 text-xs">Montant</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-slate-800/50 border-white/10 text-white text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs">Devise</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as FloatCurrency)}>
                    <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      {FLOAT_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2">
                {[50000, 100000, 250000, 500000].map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setCurrency("XAF");
                      setAmount(String(v));
                    }}
                    className="rounded-xl border border-white/10 bg-slate-800/50 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-emerald-500/40 hover:text-white transition-colors"
                  >
                    {fmt(v)}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400 text-xs">Note (optionnel)</Label>
                <Textarea
                  placeholder="Motif de la demande..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bg-slate-800/50 border-white/10 text-white min-h-[80px]"
                />
              </div>

              {hasPendingForCurrency && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <p className="text-[11px] font-medium text-amber-200/90">
                    Une demande {currency} est deja en attente. Annulez-la avant d&apos;en creer une
                    nouvelle.
                  </p>
                </div>
              )}

              <Button
                onClick={handleSubmitRecharge}
                disabled={
                  submitting || !amount || parseFloat(amount) <= 0 || hasPendingForCurrency
                }
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  "Envoyer la demande"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
