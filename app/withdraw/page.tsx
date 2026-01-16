"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { PiButton } from "@/components/PiButton";
import "flag-icons/css/flag-icons.min.css";
import {
  ArrowLeft, CircleDot, Smartphone, CreditCard, Bitcoin,
  ShieldCheck, Coins, Zap, Loader2, Lock, RefreshCcw, Globe
} from "lucide-react";

import { countries, type Country } from "@/lib/country-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { processDeposit } from "@/app/actions/deposit";

const PI_GCV_PRICE = 314159;

export default function DepositPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // On utilise tous les pays pour la sélection
  const allCountries = countries;

  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CG") || countries.find((c) => c.code === "CD") || countries[0]
  );
  const [selectedOperator, setSelectedOperator] = useState("");
  const [cardInfo, setCardInfo] = useState({ number: "", expiry: "", cvc: "" });

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (selectedCountry?.operators?.length > 0) {
      setSelectedOperator(selectedCountry.operators[0].id);
    } else {
      setSelectedOperator("");
    }
  }, [selectedCountry]);

  const refreshData = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.info("Données synchronisées");
    }, 800);
  }, []);

  const calculatePiToReceive = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return "0.000000";
    return (val / PI_GCV_PRICE).toFixed(8);
  };

  const handleStartDeposit = async (method: "mobile" | "card") => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        userId: "user_test_pimpay",
        amount: parseFloat(amount),
        method: method === "mobile" ? selectedOperator : method,
        phone: method === "mobile" ? `${selectedCountry.dialCode}${phoneNumber}` : "VIRTUAL_CARD",
        currency: selectedCountry.code,
        cardInfo: method === "card" ? cardInfo : null,
      };

      const response = await processDeposit(payload);

      if (response.success) {
        toast.success(`Dépôt ${method} initialisé !`);
        router.push(`/deposit/summary?ref=${response.reference}&method=${method}`);
      }
    } catch (error) {
        toast.error("Erreur de connexion au protocole PimPay");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#020617] text-slate-200 pb-40 font-sans transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>

      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* HEADER */}
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 active:scale-90 transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Dépôt</h1>
              <div className="flex items-center gap-2 mt-1">
                <CircleDot size={10} className="text-blue-500 animate-pulse" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">LIQUIDITY INFLOW</span>
              </div>
            </div>
          </div>

          <button onClick={refreshData} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <RefreshCcw size={18} className={`${isRefreshing ? "animate-spin text-blue-500" : "text-white/60"}`} />
          </button>
        </div>

        <Card className="bg-slate-900/60 border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Zap size={80} className="text-blue-500" />
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none italic">PimPay Protocol</p>
              <p className="text-[10px] text-white/40 mt-2 leading-relaxed font-medium italic">
                Approvisionnement sécurisé via Pi SDK & Mobile Money.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-8">
        {/* SÉLECTION DU PAYS */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2 flex items-center gap-2 italic">
            <Globe size={12} className="text-blue-500" /> Région de paiement
          </label>
          <Select
            value={selectedCountry.code}
            onValueChange={(code) => {
              const country = countries.find(c => c.code === code);
              if(country) setSelectedCountry(country);
            }}
          >
            <SelectTrigger className="w-full h-16 bg-slate-900/80 border-white/10 rounded-2xl px-6 text-white shadow-2xl">
              <SelectValue>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedCountry.flag}</span>
                  <span className="font-bold tracking-tight">{selectedCountry.name}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-white/10 text-white rounded-2xl max-h-80">
              {allCountries.map((c) => (
                <SelectItem key={c.code} value={c.code} className="focus:bg-blue-600 focus:text-white py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.flag}</span>
                    <span className="font-black uppercase text-[11px] tracking-wider">{c.name}</span>
                    {!c.isActive && <span className="text-[8px] bg-white/10 px-2 py-0.5 rounded text-white/40 italic">Bientôt</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="mobile" className="w-full">
          {/* ✅ CORRECTION COULEURS ONGLETS */}
          <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-900/80 border border-white/10 rounded-2xl p-1 shadow-inner">
            <TabsTrigger 
              value="mobile" 
              className="rounded-xl font-black text-[10px] uppercase text-white/60 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all"
            >
              <Smartphone size={14} className="mr-2" /> Mobile
            </TabsTrigger>
            <TabsTrigger 
              value="card" 
              className="rounded-xl font-black text-[10px] uppercase text-white/60 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all"
            >
              <CreditCard size={14} className="mr-2" /> Carte
            </TabsTrigger>
            <TabsTrigger 
              value="crypto" 
              className="rounded-xl font-black text-[10px] uppercase text-white/60 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all"
            >
              <Bitcoin size={14} className="mr-2" /> Crypto
            </TabsTrigger>
          </TabsList>

          {/* MOBILE MONEY */}
          <TabsContent value="mobile" className="space-y-6 mt-8">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-xl backdrop-blur-md">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2 italic">Montant (USD)</label>
                <div className="relative">
                  <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    className="h-16 bg-white/5 border-white/10 rounded-2xl pl-12 text-white font-black text-xl outline-none placeholder:text-white/10" 
                  />
                </div>
                <p className="text-[10px] text-blue-400 font-bold italic ml-2">
                  Soit environ { (Number(amount) * (selectedCountry.piToLocalRate || 0)).toLocaleString() } {selectedCountry.currency}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Réseau Opérateur</label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="w-full h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-white outline-none">
                    <SelectValue placeholder="Choisir un réseau" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 text-white rounded-2xl">
                    {selectedCountry.operators?.length > 0 ? (
                      selectedCountry.operators.map((op) => (
                        <SelectItem key={op.id} value={op.id} className="font-black text-[11px] uppercase py-4 focus:bg-blue-600">
                          <div className="flex items-center gap-3">
                            <img src={op.icon} alt={op.name} className="w-6 h-6 rounded-full object-cover bg-white p-0.5" />
                            {op.name}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-[10px] text-white/40 uppercase font-black italic">Indisponible ici</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Numéro Mobile</label>
                <div className="flex gap-2">
                    <div className="h-16 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl px-4 min-w-[80px]">
                        <span className="text-blue-500 font-black text-sm">{selectedCountry.dialCode}</span>
                    </div>
                    <Input 
                        type="tel" 
                        placeholder="Ex: 812345678" 
                        value={phoneNumber} 
                        onChange={(e) => setPhoneNumber(e.target.value)} 
                        className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-white font-black text-lg flex-1 outline-none placeholder:text-white/10" 
                    />
                </div>
              </div>

              <Button onClick={() => handleStartDeposit("mobile")} disabled={!selectedOperator || !amount || isLoading} className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/10 active:scale-95 transition-all">
                {isLoading ? <Loader2 className="animate-spin" /> : "Initier le Dépôt"}
              </Button>
            </div>
          </TabsContent>

          {/* CARTE */}
          <TabsContent value="card" className="mt-8">
             <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4 text-emerald-500">
                    <Lock size={14} /> <span className="text-[10px] font-black uppercase tracking-widest italic">Paiement Sécurisé SSL v3</span>
                </div>
                <Input placeholder="Numéro de Carte" value={cardInfo.number} onChange={(e) => setCardInfo({...cardInfo, number: e.target.value})} className="h-16 bg-white/5 border-white/10 rounded-2xl text-white outline-none px-6 font-mono" />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="MM/YY" className="h-16 bg-white/5 border-white/10 rounded-2xl text-white px-6" />
                  <Input placeholder="CVC" className="h-16 bg-white/5 border-white/10 rounded-2xl text-white px-6" />
                </div>
                <Button onClick={() => handleStartDeposit("card")} className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-600/10">Valider le Paiement</Button>
             </div>
          </TabsContent>

          {/* CRYPTO */}
          <TabsContent value="crypto" className="mt-8">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-xl text-center backdrop-blur-md">
                <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                  <Bitcoin size={40} className="text-blue-500" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Pi Network Gateway</h3>
                  <p className="text-[10px] text-white/40 mt-1 font-bold uppercase tracking-widest">Protocol Direct Settlement</p>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center bg-black/40 p-5 rounded-[1.5rem] border border-white/5">
                    <span className="text-[10px] font-black text-white/30 uppercase italic">Estimation</span>
                    <span className="text-sm font-black text-blue-400 italic">≈ {calculatePiToReceive()} PI</span>
                  </div>

                  <PiButton
                    amountUsd={amount || "0"}
                    piAmount={calculatePiToReceive()}
                    onSuccess={() => router.push('/dashboard')}
                  />

                  <p className="text-[9px] text-white/30 font-medium leading-relaxed italic px-4">
                    Les fonds sont crédités après validation sur la Mainnet Pi.
                  </p>
                </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* FOOTER STATS */}
      <div className="px-6 mt-8 grid grid-cols-2 gap-4 italic">
          <div className="bg-white/5 p-5 rounded-[2.2rem] border border-white/5 text-center backdrop-blur-sm">
              <p className="text-[9px] text-white/20 font-black uppercase tracking-tighter">Vitesse Moyenne</p>
              <p className="text-lg font-black text-white mt-1 tracking-tighter">~3-5 Min</p>
          </div>
          <div className="bg-white/5 p-5 rounded-[2.2rem] border border-white/5 text-center backdrop-blur-sm">
              <p className="text-[9px] text-white/20 font-black uppercase tracking-tighter">Frais de Dépôt</p>
              <p className="text-lg font-black text-emerald-400 mt-1 tracking-tighter">0.00%</p>
          </div>
      </div>

      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}
