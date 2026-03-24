"use client";

import { useState, useEffect, useCallback } from "react";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Building2,
  Send,
  Users,
  Building,
  Wallet,
  CreditCard,
  QrCode,
  Phone,
  User,
  Clock,
  CheckCircle2,
  Menu,
  X,
  ArrowRight,
  Plus,
  Star,
  History,
  Zap,
  Globe,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

// Types from Prisma schema / API
interface Balance {
  usd: number;
  pi: number;
}

interface RecentPayment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string | null;
  recipient: string;
  createdAt: string;
}

interface FrequentRecipient {
  userId: string;
  name: string;
  transactionCount: number;
}

interface PaymentsData {
  balance: Balance;
  recentPayments: RecentPayment[];
  frequentRecipients: FrequentRecipient[];
}

export default function PaymentsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientType, setRecipientType] = useState("internal");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");

  // Real data state
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/business/payments", {
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur de chargement");
      setData(result.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!amount || !recipient) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch("/api/business/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency,
          recipient,
          recipientType,
          description,
          method: paymentMethod,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Echec du paiement");
      setSubmitSuccess(`Paiement effectue. Reference: ${result.data.reference}`);
      setAmount("");
      setRecipient("");
      setDescription("");
      await fetchData();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  const selectRecipient = (name: string) => {
    setRecipient(name);
    setRecipientType("internal");
  };

  const statusConfig = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return { color: "bg-emerald-500/10", icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> };
      case "PENDING":
        return { color: "bg-amber-500/10", icon: <Clock className="h-4 w-4 text-amber-500" /> };
      default:
        return { color: "bg-red-500/10", icon: <X className="h-4 w-4 text-red-500" /> };
    }
  };

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <BusinessSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-black text-white">PIMPAY</h1>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase">Business</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <BusinessSidebar isMobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Mobile Header */}
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl bg-white/5 text-slate-400">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Paiements</h1>
            <p className="text-sm text-slate-500 mt-1">Effectuez des virements et paiements instantanes</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Solde disponible</p>
              {loading ? (
                <Skeleton className="h-7 w-36 bg-slate-700 mt-1" />
              ) : (
                <div>
                  <p className="text-xl font-black text-white">
                    ${(data?.balance.usd || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                  </p>
                  {(data?.balance.pi || 0) > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(data?.balance.pi || 0).toLocaleString()} PI
                    </p>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="border-white/10 rounded-xl"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Global error */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchData} className="ml-auto text-red-400 hover:text-red-300">
              Reessayer
            </Button>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Payment Form - 2 columns */}
          <div className="xl:col-span-2">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Nouveau Paiement</CardTitle>
                <CardDescription className="text-slate-500">Effectuez un virement ou paiement</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="simple" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 rounded-2xl p-1 mb-6">
                    <TabsTrigger value="simple" className="rounded-xl text-xs font-bold data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                      Paiement Simple
                    </TabsTrigger>
                    <TabsTrigger value="groupe" className="rounded-xl text-xs font-bold data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                      Paiement Groupe
                    </TabsTrigger>
                    <TabsTrigger value="international" className="rounded-xl text-xs font-bold data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                      International
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="simple" className="space-y-6">
                    {/* Payment Method Selection */}
                    <div className="space-y-3">
                      <Label className="text-slate-300 text-sm font-bold">Methode de paiement</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { id: "virement", label: "Virement", icon: Building },
                          { id: "mobile", label: "Mobile Money", icon: Phone },
                          { id: "wallet", label: "Portefeuille", icon: Wallet },
                          { id: "qrcode", label: "QR Code", icon: QrCode },
                        ].map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            className={`p-4 rounded-2xl border transition-all ${
                              paymentMethod === method.id
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                                : "bg-slate-800/30 border-white/5 text-slate-400 hover:border-white/10"
                            }`}
                          >
                            <method.icon className="h-6 w-6 mx-auto mb-2" />
                            <p className="text-xs font-bold">{method.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Recipient Type */}
                    <div className="space-y-3">
                      <Label className="text-slate-300 text-sm font-bold">Type de destinataire</Label>
                      <Select value={recipientType} onValueChange={setRecipientType}>
                        <SelectTrigger className="bg-slate-800/50 border-white/10 rounded-2xl h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          <SelectItem value="internal">Utilisateur PimPay</SelectItem>
                          <SelectItem value="external">Compte externe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Recipient */}
                    <div className="space-y-3">
                      <Label className="text-slate-300 text-sm font-bold">Destinataire</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <Input
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          placeholder={recipientType === "internal" ? "Email, telephone ou nom d'utilisateur" : "Nom ou compte"}
                          className="pl-12 h-14 bg-slate-800/50 border-white/10 text-base rounded-2xl"
                        />
                      </div>
                    </div>

                    {/* Amount + Currency */}
                    <div className="space-y-3">
                      <Label className="text-slate-300 text-sm font-bold">Montant</Label>
                      <div className="flex gap-3">
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger className="w-28 bg-slate-800/50 border-white/10 rounded-2xl h-16 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10">
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="XAF">XAF</SelectItem>
                            <SelectItem value="PI">PI</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="relative flex-1">
                          <Input
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            type="number"
                            min="0"
                            className="h-16 bg-slate-800/50 border-white/10 text-3xl font-black rounded-2xl"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {["100", "500", "1000", "5000"].map((preset) => (
                          <Button
                            key={preset}
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(preset)}
                            className="border-white/10 text-xs font-bold"
                          >
                            {preset}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                      <Label className="text-slate-300 text-sm font-bold">Description (optionnel)</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Motif du paiement..."
                        className="bg-slate-800/50 border-white/10 rounded-2xl resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Feedback messages */}
                    {submitError && (
                      <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <p className="text-sm text-red-400">{submitError}</p>
                      </div>
                    )}
                    {submitSuccess && (
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-sm text-emerald-400">{submitSuccess}</p>
                      </div>
                    )}

                    {/* Submit */}
                    <div className="pt-4">
                      <Button
                        className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-base font-black rounded-2xl"
                        disabled={!amount || !recipient || submitting}
                        onClick={handleSubmit}
                      >
                        {submitting ? (
                          <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5 mr-3" />
                        )}
                        {submitting ? "Traitement..." : "Envoyer le Paiement"}
                      </Button>
                      <p className="text-center text-xs text-slate-500 mt-3">
                        Solde disponible: ${(data?.balance.usd || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} USD
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="groupe" className="space-y-6">
                    <div className="p-8 rounded-2xl bg-slate-800/30 border border-dashed border-white/10 text-center">
                      <Users className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                      <h3 className="text-lg font-bold text-white mb-2">Paiement de Groupe</h3>
                      <p className="text-sm text-slate-500 mb-4">Payez plusieurs destinataires en une seule fois</p>
                      <Button variant="outline" className="border-white/10 font-bold">
                        <Plus className="h-4 w-4 mr-2" />
                        Importer une liste CSV
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="international" className="space-y-6">
                    <div className="p-8 rounded-2xl bg-slate-800/30 border border-dashed border-white/10 text-center">
                      <Globe className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                      <h3 className="text-lg font-bold text-white mb-2">Paiement International</h3>
                      <p className="text-sm text-slate-500 mb-4">{"Envoyez des fonds a l'etranger avec des taux competitifs"}</p>
                      <Button className="bg-emerald-500 hover:bg-emerald-600 font-bold">
                        <Zap className="h-4 w-4 mr-2" />
                        Commencer
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Frequent Recipients */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-white">Frequents</CardTitle>
                  <Button variant="ghost" size="sm" className="text-emerald-500 text-xs font-bold">
                    Voir tout
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/30">
                      <Skeleton className="w-10 h-10 rounded-xl bg-slate-700" />
                      <div>
                        <Skeleton className="h-4 w-32 bg-slate-700 mb-1" />
                        <Skeleton className="h-3 w-20 bg-slate-700" />
                      </div>
                    </div>
                  ))
                ) : data?.frequentRecipients && data.frequentRecipients.length > 0 ? (
                  data.frequentRecipients.map((r) => (
                    <button
                      key={r.userId}
                      onClick={() => selectRecipient(r.name)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/30 border border-white/5 hover:border-emerald-500/30 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{r.name}</p>
                          <p className="text-[10px] text-slate-500">{r.transactionCount} transaction(s)</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-500 text-sm">Aucun destinataire frequent</p>
                  </div>
                )}
                <Button variant="outline" className="w-full border-dashed border-white/10 text-xs font-bold">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un destinataire
                </Button>
              </CardContent>
            </Card>

            {/* Balance Overview */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-white">Soldes</CardTitle>
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <>
                    <Skeleton className="h-20 rounded-2xl bg-slate-800" />
                    <Skeleton className="h-20 rounded-2xl bg-slate-800" />
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <Wallet className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-bold">USD</p>
                            <p className="text-lg font-black text-white">
                              ${(data?.balance.usd || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">
                          Disponible
                        </Badge>
                      </div>
                    </div>
                    {(data?.balance.pi || 0) > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                              <CreditCard className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-bold">PI</p>
                              <p className="text-lg font-black text-white">
                                {(data?.balance.pi || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold">
                            Disponible
                          </Badge>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-white">Recents</CardTitle>
                  <History className="h-5 w-5 text-slate-500" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/30">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-xl bg-slate-700" />
                        <div>
                          <Skeleton className="h-3 w-28 bg-slate-700 mb-1" />
                          <Skeleton className="h-2.5 w-20 bg-slate-700" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-16 bg-slate-700" />
                    </div>
                  ))
                ) : data?.recentPayments && data.recentPayments.length > 0 ? (
                  data.recentPayments.slice(0, 6).map((payment) => {
                    const { color, icon } = statusConfig(payment.status);
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/30 border border-white/5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${color}`}>
                            {icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate max-w-[130px]">
                              {payment.recipient}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(payment.createdAt).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-sm font-black text-white">
                            {payment.amount.toLocaleString()} {payment.currency}
                          </p>
                          <p className="text-[10px] text-slate-500">{payment.type}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6">
                    <History className="h-10 w-10 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Aucun paiement recent</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
