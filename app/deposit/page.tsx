"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft, CircleDot, ArrowDownToLine, Smartphone,
  CreditCard, Bitcoin, ShieldCheck, Zap, Info, Copy, Check, ExternalLink, Loader2
} from "lucide-react";
import Link from "next/link";
import { CountrySelect } from "@/components/country-select";
import { countries, type Country } from "@/lib/country-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "flag-icons/css/flag-icons.min.css";
import { toast } from "sonner";

export default function DepositPage() {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0],
  );
  const [selectedOperator, setSelectedOperator] = useState("");
  
  // États pour la section Crypto
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PIMPAY_WALLET_ADDRESS = "GD3SGMIZH6NAQ3RY7KQZDSSDHTN2K2HFKRRPEVAWWFJGL4CZ7MXW7UQR";
  const piPrice = 314159.0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(PIMPAY_WALLET_ADDRESS);
    setCopied(true);
    toast.success("Adresse copiée !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitCrypto = async () => {
    if (!txHash || txHash.length < 15) {
        return toast.error("Veuillez entrer un Hash de transaction valide");
    }
    setIsSubmitting(true);
    try {
        // Appel à ton API de dépôt
        const res = await fetch("/api/transaction/deposit", {
            method: "POST",
            body: JSON.stringify({ txHash, provider: "PI_NETWORK" })
        });
        if (res.ok) {
            toast.success("Demande de dépôt enregistrée. En attente de validation.");
            setTxHash("");
        } else {
            toast.error("Erreur lors de la soumission");
        }
    } catch (err) {
        toast.error("Erreur de connexion");
    } finally {
        setIsSubmitting(false);
    }
  };

  const getPiAmount = () => {
    if (!amount || !mounted) return "0.000000";
    return (Number.parseFloat(amount) / piPrice).toFixed(6);
  };

  const getLocalAmount = () => {
    if (!amount || !mounted) return "0.00";
    return ((Number.parseFloat(amount) * selectedCountry.piToLocalRate) / piPrice).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans selection:bg-blue-500/30">

      {/* HEADER FINTECH */}
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
              <ArrowLeft size={20} />
            </div>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Dépôt</h1>
            <div className="flex items-center gap-2 mt-1">
              <CircleDot size={10} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Liquidity Inflow</span>
            </div>
          </div>
        </div>

        <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <ArrowDownToLine size={80} className="text-blue-500" />
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-white uppercase tracking-widest">Passerelle Sécurisée</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                Alimentez votre compte PimPay via Mobile Money ou directement par transfert Pi Network.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-8">
        <Tabs defaultValue="mobile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-900/50 border border-white/5 rounded-2xl p-1">
            <TabsTrigger value="mobile" className="rounded-xl font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Smartphone size={14} className="mr-2" /> Mobile
            </TabsTrigger>
            <TabsTrigger value="card" className="rounded-xl font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <CreditCard size={14} className="mr-2" /> Carte
            </TabsTrigger>
            <TabsTrigger value="crypto" className="rounded-xl font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Bitcoin size={14} className="mr-2" /> Crypto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mobile" className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-2">
            {/* ... Le code Mobile Money reste identique ... */}
            <div className="space-y-6">
                <div className="space-y-2 px-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Région / Pays</label>
                  <CountrySelect value={selectedCountry} onChange={setSelectedCountry} />
                </div>
                {/* [Reste du contenu Mobile Money ici] */}
                <p className="text-center text-[10px] text-slate-600 font-bold uppercase">Section Mobile Money Active</p>
            </div>
          </TabsContent>

          {/* SECTION CRYPTO MISE À JOUR */}
          <TabsContent value="crypto" className="mt-8 space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
              <div className="flex justify-center">
                 <div className="w-20 h-20 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center text-blue-500">
                    <Bitcoin size={40} />
                 </div>
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="font-black text-white uppercase tracking-tighter text-xl italic">Mainnet Pi Network</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Envoi direct vers Wallet</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Adresse de réception PimPay</label>
                    <div className="relative group">
                        <div className="bg-black/50 border border-white/5 rounded-2xl p-5 pr-14 break-all font-mono text-[11px] text-blue-200 leading-relaxed transition-all group-hover:border-blue-500/30">
                            {PIMPAY_WALLET_ADDRESS}
                        </div>
                        <button 
                            onClick={handleCopyAddress}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-xl text-white shadow-lg active:scale-90 transition-all"
                        >
                            {copied ? <Check size={16}/> : <Copy size={16}/>}
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
                    <Info className="text-amber-500 shrink-0" size={16} />
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">
                        Envoyez vos Pi depuis votre <strong>Pi Browser</strong>. Une fois envoyé, collez le <strong>Transaction Hash</strong> ci-dessous.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Hash de Transaction (Preuve)</label>
                    <Input
                        placeholder="Ex: 5f3d9b2e1c..."
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 font-mono text-sm text-white focus:border-blue-500/50"
                    />
                </div>

                <Button 
                    onClick={handleSubmitCrypto}
                    disabled={isSubmitting || !txHash}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-600/20"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Vérifier mon dépôt"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="card" className="mt-8 text-center py-12 border border-dashed border-white/5 rounded-[2rem]">
            <CreditCard size={32} className="mx-auto text-slate-700 mb-4" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paiement par carte bientôt disponible</p>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
