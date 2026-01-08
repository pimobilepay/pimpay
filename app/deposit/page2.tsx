"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft, CircleDot, ArrowDownToLine, Smartphone,
  CreditCard, Bitcoin, ShieldCheck, Copy, Check, Coins, Zap,
  Loader2, Info, Lock
} from "lucide-react";
import Link from "next/link";
import { CountrySelect } from "@/components/country-select";
import { countries, type Country } from "@/lib/country-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Flag from "react-world-flags";
import { processDeposit } from "@/app/actions/deposit";

const PI_GCV_PRICE = 314159;

export default function DepositPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // États du formulaire
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0]
  );
  const [selectedOperator, setSelectedOperator] = useState("");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);

  // États pour le test de Carte Virtuelle
  const [cardInfo, setCardInfo] = useState({ number: "", expiry: "", cvc: "" });

  const PIMPAY_WALLET_ADDRESS = "GD3SGMIZH6NAQ3RY7KQZDSSDHTN2K2HFKRRPEVAWWFJGL4CZ7MXW7UQR";

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePiToReceive = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return "0.000000";
    return (val / PI_GCV_PRICE).toFixed(8);
  };

  const handleStartDeposit = async (method: "mobile" | "card" | "crypto") => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    setIsLoading(true);
    try {
      // Simulation pour le test
      const mockUserId = "user_test_pimpay";
      
      const payload = {
        userId: mockUserId,
        amount: parseFloat(amount),
        method: method === "mobile" ? selectedOperator : method,
        phone: method === "mobile" ? `${selectedCountry.dialCode}${phoneNumber}` : "CARD_PAYMENT",
        currency: selectedCountry.code
      };

      const response = await processDeposit(payload);

      if (response.success) {
        toast.success(`Dépôt ${method} initialisé !`);
        router.push(`/deposit/summary?ref=${response.reference}`);
      } else {
        toast.error(response.error);
      }
    } catch (error) {
      toast.error("Une erreur est survenue lors du traitement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(PIMPAY_WALLET_ADDRESS);
    setCopied(true);
    toast.success("Adresse copiée !");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-40 font-sans selection:bg-blue-500/30">

      {/* HEADER */}
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all active:scale-90">
              <ArrowLeft size={20} />
            </div>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Recharge</h1>
            <div className="flex items-center gap-2 mt-1">
              <CircleDot size={10} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Gateway Protocol</span>
            </div>
          </div>
        </div>

        <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Zap size={80} className="text-blue-500" />
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none">PimPay Secure</p>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed font-medium">
                Système de dépôt automatisé GCV.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-8">
        <Tabs defaultValue="mobile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-900/80 border border-white/10 rounded-2xl p-1">
            <TabsTrigger value="mobile" className="rounded-xl font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-blue-600 transition-all">
              <Smartphone size={14} className="mr-2" /> Mobile
            </TabsTrigger>
            <TabsTrigger value="card" className="rounded-xl font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-blue-600 transition-all">
              <CreditCard size={14} className="mr-2" /> Carte
            </TabsTrigger>
            <TabsTrigger value="crypto" className="rounded-xl font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-blue-600 transition-all">
              <Bitcoin size={14} className="mr-2" /> Crypto
            </TabsTrigger>
          </TabsList>

          {/* --- MOBILE MONEY --- */}
          <TabsContent value="mobile" className="space-y-6 mt-8">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-xl relative overflow-hidden">
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Région / Pays</label>
                <div className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-2xl p-2 px-3 h-16">
                   <div className="w-9 h-9 flex items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-800 shrink-0">
                      <Flag code={selectedCountry.code} className="w-full h-full object-cover scale-110" />
                   </div>
                   <div className="flex-1">
                      <CountrySelect
                        value={selectedCountry}
                        onChange={(country) => {
                          setSelectedCountry(country);
                          setSelectedOperator("");
                        }}
                        options={countries} // Assure-toi que countries contient CI, CM, SN, CD, etc.
                      />
                   </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Montant (USD)</label>
                <div className="relative">
                  <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-16 bg-white/5 border-white/10 rounded-2xl pl-12 text-white font-black text-xl"
                  />
                </div>
                <div className="flex justify-between items-center px-2 mt-1 text-blue-400">
                  <span className="text-[9px] font-bold uppercase">Conversion Pi GCV</span>
                  <span className="text-[10px] font-black tracking-tighter">≈ {calculatePiToReceive()} PI</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Opérateur</label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-2xl px-4 text-white">
                    <SelectValue placeholder="Choisir un réseau" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 text-white rounded-2xl">
                    {selectedCountry.operators.map((op) => (
                      <SelectItem key={op.id} value={op.id} className="focus:bg-blue-600 rounded-xl py-3">
                        <div className="flex items-center gap-3 uppercase font-bold text-xs tracking-tighter">
                          {op.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Téléphone</label>
                <div className="flex gap-2">
                    <div className="h-16 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl px-3 min-w-[85px]">
                        <span className="text-blue-500 font-black text-sm">{selectedCountry.dialCode}</span>
                    </div>
                    <Input
                        type="tel"
                        placeholder="000 000 000"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-white font-black text-lg flex-1"
                    />
                </div>
              </div>

              <Button
                onClick={() => handleStartDeposit("mobile")}
                disabled={!selectedOperator || !amount || isLoading}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Initier le dépôt"}
              </Button>
            </div>
          </TabsContent>

          {/* --- ONGLET CARTE (TEST CARTE VIRTUELLE) --- */}
          <TabsContent value="card" className="space-y-6 mt-8">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                    <Lock size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Paiement Sécurisé PCI-DSS</span>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Numéro de Carte Virtuelle</label>
                        <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <Input
                                placeholder="4242 4242 4242 4242"
                                value={cardInfo.number}
                                onChange={(e) => setCardInfo({...cardInfo, number: e.target.value})}
                                className="h-16 bg-white/5 border-white/10 rounded-2xl pl-12 text-white font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Expiration</label>
                            <Input
                                placeholder="MM/YY"
                                value={cardInfo.expiry}
                                onChange={(e) => setCardInfo({...cardInfo, expiry: e.target.value})}
                                className="h-16 bg-white/5 border-white/10 rounded-2xl px-4 text-white font-mono text-center"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">CVC</label>
                            <Input
                                placeholder="123"
                                value={cardInfo.cvc}
                                onChange={(e) => setCardInfo({...cardInfo, cvc: e.target.value})}
                                className="h-16 bg-white/5 border-white/10 rounded-2xl px-4 text-white font-mono text-center"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3">
                        <Info size={20} className="text-blue-500 shrink-0" />
                        <p className="text-[10px] text-slate-400 leading-tight">
                            Utilisez votre carte virtuelle PimPay pour un approvisionnement instantané. Montant minimum : 5 USD.
                        </p>
                    </div>

                    <Button
                        onClick={() => handleStartDeposit("card")}
                        disabled={!cardInfo.number || isLoading}
                        className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Payer par Carte"}
                    </Button>
                </div>
            </div>
          </TabsContent>

          {/* --- ONGLET CRYPTO --- */}
          <TabsContent value="crypto" className="mt-8 space-y-6">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                <div className="text-center">
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">Pi Mainnet Address</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <div className="bg-black/40 border border-blue-500/20 rounded-2xl p-5 pr-14 break-all font-mono text-[10px] text-blue-100 min-h-[70px] flex items-center">
                                {PIMPAY_WALLET_ADDRESS}
                            </div>
                            <button onClick={handleCopyAddress} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-xl text-white active:scale-90 transition-all">
                                {copied ? <Check size={16}/> : <Copy size={16}/>}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-white uppercase ml-2 tracking-widest opacity-80">Transaction Hash</label>
                        <Input
                            placeholder="Coller l'ID de transaction Pi..."
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 font-mono text-xs text-white"
                        />
                    </div>

                    <Button
                    onClick={() => handleStartDeposit("crypto")}
                    disabled={!txHash || isLoading}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl"
                    >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Vérifier le paiement"}
                    </Button>
                </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* FOOTER STATS */}
        <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Délai Pi</p>
                <p className="text-lg font-black text-white mt-1">~3 Min</p>
            </div>
            <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Commission</p>
                <p className="text-lg font-black text-emerald-400 mt-1">0.00%</p>
            </div>
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
