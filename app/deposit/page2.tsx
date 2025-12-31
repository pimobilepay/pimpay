"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft, CircleDot, ArrowDownToLine, Smartphone,
  CreditCard, Bitcoin, ShieldCheck, Info, Copy, Check, Loader2, Phone
} from "lucide-react";
import Link from "next/link";
import { CountrySelect } from "@/components/country-select";
import { countries, type Country } from "@/lib/country-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "flag-icons/css/flag-icons.min.css";
import { toast } from "sonner";

// Liste des opérateurs avec liens d'icônes optimisés
const operators = [
  { id: "orange", name: "Orange Money", icon: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg" },
  { id: "airtel", name: "Airtel Money", icon: "https://cryptologos.cc/logos/airtel-logo.png" }, // Lien alternatif pour Airtel
  { id: "vodacom", name: "M-Pesa / Vodacom", icon: "https://upload.wikimedia.org/wikipedia/commons/2/29/Vodacom_Logo.svg" },
  { id: "mtn", name: "MTN MoMo", icon: "https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg" },
];

export default function DepositPage() {
  const [mounted, setMounted] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0],
  );
  const [selectedOperator, setSelectedOperator] = useState("");

  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PIMPAY_WALLET_ADDRESS = "GD3SGMIZH6NAQ3RY7KQZDSSDHTN2K2HFKRRPEVAWWFJGL4CZ7MXW7UQR";

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
      const res = await fetch("/api/transaction/deposit", {
        method: "POST",
        body: JSON.stringify({ txHash, provider: "PI_NETWORK" })
      });
      if (res.ok) {
        toast.success("Demande enregistrée.");
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

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans selection:bg-blue-500/30">
      
      {/* HEADER */}
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

        <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-6 relative overflow-hidden shadow-2xl border-l-4 border-l-blue-500">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <ArrowDownToLine size={80} className="text-blue-500" />
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-white uppercase tracking-widest">Passerelle Sécurisée</p>
              <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                Alimentez votre compte PimPay via Mobile Money ou Pi Network.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-8">
        <Tabs defaultValue="mobile" className="w-full">
          {/* Correction Couleur Onglets - Texte blanc pour lisibilité */}
          <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-900/80 border border-white/10 rounded-2xl p-1">
            <TabsTrigger value="mobile" className="rounded-xl font-bold text-[10px] uppercase tracking-wider text-slate-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <Smartphone size={14} className="mr-2" /> Mobile
            </TabsTrigger>
            <TabsTrigger value="card" className="rounded-xl font-bold text-[10px] uppercase tracking-wider text-slate-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <CreditCard size={14} className="mr-2" /> Carte
            </TabsTrigger>
            <TabsTrigger value="crypto" className="rounded-xl font-bold text-[10px] uppercase tracking-wider text-slate-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <Bitcoin size={14} className="mr-2" /> Crypto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mobile" className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-xl">
              
              {/* SÉLECTEUR DE PAYS - Lisibilité accrue */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Région / Pays</label>
                <CountrySelect value={selectedCountry} onChange={setSelectedCountry} />
              </div>

              {/* SÉLECTION OPÉRATEUR */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Opérateur Mobile</label>
                <Select onValueChange={setSelectedOperator}>
                  <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-2xl px-4 text-white hover:border-blue-500/50 transition-colors">
                    <SelectValue placeholder="Sélectionnez votre réseau" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 text-white rounded-2xl shadow-2xl">
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id} className="focus:bg-blue-600 focus:text-white rounded-xl py-3 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <img src={op.icon} alt={op.name} className="w-7 h-7 object-contain rounded-md bg-white p-0.5" />
                          <span className="font-bold text-xs uppercase">{op.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* INDICATIF DYNAMIQUE ET NUMÉRO BLANC */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Numéro de téléphone</label>
                <div className="flex gap-2">
                    <div className="h-16 flex items-center justify-center bg-blue-600/20 border border-blue-500/30 rounded-2xl px-4 min-w-[85px] transition-all">
                        <span className="text-white font-black text-sm tracking-tighter">
                          +{selectedCountry.phoneCode}
                        </span>
                    </div>
                    <div className="relative flex-1">
                        <Input 
                            type="tel"
                            placeholder="812345678"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-white font-black text-lg focus:border-blue-500 placeholder:text-slate-600"
                        />
                    </div>
                </div>
              </div>

              <Button className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all">
                Confirmer le dépôt
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="crypto" className="mt-8 space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
              
              <div className="text-center space-y-2">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">Paiement Pi Mainnet</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-white uppercase ml-2 tracking-widest">Adresse Pi Wallet (Copiez)</label>
                    <div className="relative group">
                        <div className="bg-black/60 border border-blue-500/30 rounded-2xl p-5 pr-14 break-all font-mono text-[11px] text-blue-100 leading-relaxed shadow-inner">
                            {PIMPAY_WALLET_ADDRESS}
                        </div>
                        <button
                            onClick={handleCopyAddress}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-xl text-white shadow-lg active:scale-90 transition-all hover:bg-blue-500"
                        >
                            {copied ? <Check size={16}/> : <Copy size={16}/>}
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-3">
                    <Info className="text-blue-400 shrink-0" size={16} />
                    <p className="text-[9px] text-slate-300 font-bold uppercase leading-relaxed">
                        Envoyez le montant souhaité, puis collez le <span className="text-white">Hash de transaction</span> pour vérification.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] font-black text-white uppercase ml-2 tracking-widest">Hash de Transaction (Preuve)</label>
                    <Input
                        placeholder="Ex: 5f3d9b2e1c..."
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 font-mono text-sm text-white focus:border-blue-500 placeholder:text-slate-600"
                    />
                </div>

                <Button
                    onClick={handleSubmitCrypto}
                    disabled={isSubmitting || !txHash}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Vérifier la transaction"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="card" className="mt-8 text-center py-12 border border-dashed border-white/10 rounded-[2rem] bg-slate-900/20">
            <CreditCard size={32} className="mx-auto text-slate-600 mb-4" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Option bientôt disponible</p>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
