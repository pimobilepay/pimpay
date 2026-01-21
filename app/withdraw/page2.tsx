"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft, ArrowUpFromLine, Smartphone, Building2,
  Clock, ShieldCheck, CircleDot, Loader2, CheckCircle2,
  Landmark
} from "lucide-react";
import Link from "next/link";
import { countries, type Country } from "@/lib/country-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PI_CONSENSUS_USD, calculateExchangeWithFee } from "@/lib/exchange";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function WithdrawPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [piAmount, setPiAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0],
  );
  const [selectedOperator, setSelectedOperator] = useState("");
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [issubmitting, setIsSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [bankInfo, setBankInfo] = useState({
    bankName: "",
    iban: "",
    swift: "",
    accountName: ""
  });

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const profileRes = await fetch("/api/user/profile");
      if (profileRes.ok) {
        const data = await profileRes.json();
        setBalance(data.balance || 0);
      }
      const txRes = await fetch("/api/user/transactions?type=WITHDRAWAL");
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoadingBalance(false);
    }
  }

  const formatValue = (val: number) => {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // LOGIQUE MISE À JOUR : Redirection vers Summary
  const handleWithdraw = async (method: "mobile" | "bank") => {
    const amount = parseFloat(piAmount);
    if (!amount || amount <= 0) return toast.error("Montant invalide");
    if (amount > balance) return toast.error("Solde insuffisant");

    let details = {};
    if (method === "mobile") {
      if (!selectedOperator) return toast.error("Sélectionnez un opérateur");
      if (!phoneNumber) return toast.error("Numéro de téléphone requis");
      details = { 
        phone: `${selectedCountry.dialCode}${phoneNumber}`, 
        provider: selectedOperator,
        country: selectedCountry.name 
      };
    } else {
      if (!bankInfo.iban || !bankInfo.bankName) return toast.error("Infos bancaires incomplètes");
      details = bankInfo;
    }

    // Calcul final pour le résumé
    const conversion = calculateExchangeWithFee(amount, selectedCountry.currency);

    const summaryData = {
      amount: amount,
      method: method,
      currency: selectedCountry.currency,
      fiatAmount: conversion.total,
      details: details
    };

    // Encodage pour l'URL
    const encodedData = btoa(JSON.stringify(summaryData));
    router.push(`/withdraw/summary?data=${encodedData}`);
  };

  if (!mounted) return null;

  const conversion = piAmount ? calculateExchangeWithFee(parseFloat(piAmount), selectedCountry.currency) : { total: 0 };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans">
      {/* Ton Design de Header reste identique */}
      <div className="px-6 pt-12 pb-16 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </div>
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Retrait</h1>
            <div className="flex items-center gap-2 mt-1">
              <CircleDot size={10} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">LIQUIDITY OUTFLOW</span>
            </div>
          </div>
        </div>

        <Card className="bg-slate-900/60 border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="absolute -right-4 -top-4 opacity-10 text-blue-500">
            <ArrowUpFromLine size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Solde Pi disponible</p>
            <div className="text-4xl font-black text-white tracking-tighter">
              {loadingBalance ? <Loader2 className="animate-spin text-blue-500" size={24} /> : `π ${formatValue(balance)}`}
            </div>
          </div>
        </Card>
      </div>

      <div className="px-6 -mt-10 space-y-8">
        <Tabs defaultValue="mobile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-900/80 border border-white/10 rounded-2xl p-1 shadow-inner">
            <TabsTrigger value="mobile" className="rounded-xl font-bold text-[10px] uppercase text-slate-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Smartphone size={14} className="mr-2" /> Mobile
            </TabsTrigger>
            <TabsTrigger value="bank" className="rounded-xl font-bold text-[10px] uppercase text-slate-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Building2 size={14} className="mr-2" /> Banque
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl font-bold text-[10px] uppercase text-slate-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Clock size={14} className="mr-2" /> Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mobile" className="mt-8 space-y-6">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-xl">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2">Pays de destination</label>
                <Select value={selectedCountry.code} onValueChange={(code) => {
                    const country = countries.find(c => c.code === code);
                    if (country) { setSelectedCountry(country); setSelectedOperator(""); }
                  }}>
                  <SelectTrigger className="w-full h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-white outline-none focus:ring-0">
                    <SelectValue placeholder="Choisir pays" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 text-white rounded-2xl">
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="focus:bg-blue-600 py-3 cursor-pointer">
                        <span className="font-bold text-xs uppercase">{c.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2">Opérateur Mobile Money</label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="w-full h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-white outline-none">
                    <SelectValue placeholder="Sélectionnez un réseau" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 text-white rounded-2xl">
                    {selectedCountry.operators?.map((op) => (
                      <SelectItem key={op.id} value={op.name} className="focus:bg-blue-600 py-4 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <img src={op.icon} alt="" className="w-6 h-6 rounded-md object-contain bg-white p-0.5" />
                          <span className="uppercase font-black text-xs">{op.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2">Numéro bénéficiaire</label>
                <div className="flex gap-2">
                  <div className="h-16 w-20 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-sm font-black text-blue-500">
                    {selectedCountry.dialCode}
                  </div>
                  <Input type="tel" placeholder="Ex: 812345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-lg font-black text-white outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2">Montant à retirer (π)</label>
                <div className="relative">
                  <Input type="number" placeholder="0.00" value={piAmount} onChange={(e) => setPiAmount(e.target.value)}
                    className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-2xl font-black text-white outline-none" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 px-3 py-1 rounded-lg text-[10px] font-black text-white">PI</div>
                </div>
              </div>

              {piAmount && (
                <div className="p-6 bg-blue-600/5 border border-blue-500/10 rounded-[2rem] space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                    <span>Valeur Marché ($)</span>
                    <span className="text-white">$ {formatValue(Number(piAmount) * PI_CONSENSUS_USD)}</span>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter italic">Cashout estimé</span>
                      <span className="text-2xl font-black text-blue-400">{formatValue(conversion.total)}</span>
                    </div>
                    <span className="text-sm font-black text-slate-400">{selectedCountry.currency}</span>
                  </div>
                </div>
              )}

              <Button onClick={() => handleWithdraw("mobile")} disabled={issubmitting || !piAmount || !phoneNumber || !selectedOperator}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                {issubmitting ? <Loader2 className="animate-spin" /> : "Vérifier le Cashout"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="bank" className="mt-8 space-y-6">
             <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-6">
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <Landmark className="text-amber-500" size={20} />
                    <p className="text-[10px] font-bold text-amber-500 uppercase">Transfert Bancaire Sécurisé</p>
                </div>
                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/60 uppercase ml-2">Sélectionner la banque</label>
                      <Select onValueChange={(val) => setBankInfo({...bankInfo, bankName: val})}>
                        <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-white font-bold italic outline-none">
                          <SelectValue placeholder="Banques partenaires" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-white/10 text-white rounded-2xl">
                          {selectedCountry.banks?.map(bank => (
                            <SelectItem key={bank.bic} value={bank.name} className="py-3 uppercase font-bold text-xs cursor-pointer">
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/60 uppercase ml-2">Numéro de compte / IBAN</label>
                      <Input placeholder="Coordonnées bancaires" className="h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-white font-mono outline-none"
                        value={bankInfo.iban} onChange={(e) => setBankInfo({...bankInfo, iban: e.target.value})} />
                   </div>
                   <Button onClick={() => handleWithdraw("bank")} disabled={issubmitting || !piAmount || !bankInfo.iban}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all">
                    {issubmitting ? <Loader2 className="animate-spin" /> : "Vérifier le Virement"}
                  </Button>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="history" className="mt-8 space-y-4">
             {/* Ton design de l'historique reste identique */}
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <Card key={tx.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center backdrop-blur-sm">
                  <div className="flex gap-3 items-center">
                    <div className={`p-3 rounded-xl ${tx.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {tx.status === 'SUCCESS' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase italic">{tx.metadata?.method || 'Cashout'}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">-{tx.amount} π</p>
                    <p className={`text-[8px] font-black uppercase ${tx.status === 'SUCCESS' ? 'text-emerald-500' : 'text-amber-500'}`}>{tx.status}</p>
                  </div>
                </Card>
              ))
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                <Clock size={40} className="mx-auto text-slate-800 mb-4" />
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Aucune activité</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Design identique */}
        <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] flex items-start gap-4 backdrop-blur-sm">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-inner">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">PimPay Protection</p>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Fonds protégés. Traitement : 15 min (Mobile) à 48h (Banque). Projet PimPay {new Date().getFullYear()}.
            </p>
          </div>
        </div>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
