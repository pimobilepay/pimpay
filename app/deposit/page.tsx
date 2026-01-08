"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft, CircleDot, Smartphone, CreditCard, Bitcoin,
  ShieldCheck, Copy, Check, Coins, Zap, Loader2, Info, Lock
} from "lucide-react";
import Link from "next/link";
import { countries, type Country } from "@/lib/country-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { processDeposit } from "@/app/actions/deposit";

const PI_GCV_PRICE = 314159;

export default function DepositPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CG") || countries.find((c) => c.code === "CD") || countries[0]
  );
  const [selectedOperator, setSelectedOperator] = useState("");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
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
      const mockUserId = "user_test_pimpay";
      const payload = {
        userId: mockUserId,
        amount: parseFloat(amount),
        method: method === "mobile" ? selectedOperator : method,
        phone: method === "mobile" ? `${selectedCountry.dialCode}${phoneNumber}` : "VIRTUAL_CARD",
        currency: selectedCountry.code,
        cardInfo: method === "card" ? cardInfo : null,
        isSandbox: true
      };

      const response = await processDeposit(payload);

      if (response.success) {
        toast.success(`Dépôt ${method} initialisé !`);
        router.push(`/deposit/summary?ref=${response.reference}&method=${method}`);
      } else {
        router.push(`/deposit/failed?error=${encodeURIComponent(response.error || "Échec")}`);
      }
    } catch (error) {
        toast.error("Erreur de connexion au protocole PimPay");
        router.push(`/deposit/failed?error=Network_Error`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(PIMPAY_WALLET_ADDRESS);
      setCopied(true);
      toast.success("Adresse copiée !");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-40 font-sans" suppressHydrationWarning>

      {/* HEADER */}
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </div>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic"><span>Dépôt</span></h1>
            <div className="flex items-center gap-2 mt-1">
              <CircleDot size={10} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">LIQUIDITY INFLOW</span>
            </div>
          </div>
        </div>

        <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-6 relative overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Zap size={80} className="text-blue-500" />
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none">PimPay Protocol</p>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed font-medium italic">
                <span>Approvisionnement sécurisé de votre compte PimPay.</span>
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-8">
        <Tabs defaultValue="mobile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-900/80 border border-white/10 rounded-2xl p-1 shadow-inner">
            <TabsTrigger value="mobile" className="rounded-xl font-bold text-[10px] uppercase text-slate-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <Smartphone size={14} className="mr-2" /> <span>Mobile</span>
            </TabsTrigger>
            <TabsTrigger value="card" className="rounded-xl font-bold text-[10px] uppercase text-slate-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <CreditCard size={14} className="mr-2" /> <span>Carte</span>
            </TabsTrigger>
            <TabsTrigger value="crypto" className="rounded-xl font-bold text-[10px] uppercase text-slate-400 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <Bitcoin size={14} className="mr-2" /> <span>Crypto</span>
            </TabsTrigger>
          </TabsList>

          {/* --- MOBILE MONEY --- */}
          <TabsContent value="mobile" key="mobile-content" className="space-y-6 mt-8">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-xl">

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2"><span>Pays</span></label>
                <Select
                  value={selectedCountry.code}
                  onValueChange={(code) => {
                    const country = countries.find(c => c.code === code);
                    if (country) {
                      setSelectedCountry(country);
                      setSelectedOperator("");
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-white outline-none focus:ring-0">
                    <SelectValue placeholder="Choisir un pays" />
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
                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2"><span>Montant (USD)</span></label>
                <div className="relative">
                  <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-16 bg-white/5 border-white/10 rounded-2xl pl-12 text-white font-black text-xl outline-none"
                  />
                </div>
                <div className="flex justify-between px-2 mt-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Conversion GCV</span>
                  <span className="text-[10px] font-black text-blue-400 italic"><span>≈ {calculatePiToReceive()} PI</span></span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2"><span>Réseau</span></label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="w-full h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-white outline-none">
                    <SelectValue placeholder="Choisir un opérateur" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 text-white rounded-2xl">
                    {selectedCountry.operators.map((op) => (
                      <SelectItem key={op.id} value={op.id} className="focus:bg-blue-600 py-3 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <img src={op.icon} alt="" className="w-6 h-6 object-contain rounded-md bg-white p-0.5 shadow-sm" />
                          <span className="font-bold text-xs uppercase">{op.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2"><span>Numéro Mobile Money</span></label>
                <div className="flex gap-2">
                    <div className="h-16 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl px-4 min-w-[85px] shadow-inner">
                        <span className="text-blue-500 font-black text-sm"><span>{selectedCountry.dialCode}</span></span>
                    </div>
                    <Input
                        type="tel"
                        placeholder="Numéro sans l'indicatif"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-white font-black text-lg flex-1 outline-none"
                    />
                </div>
              </div>

              <Button
                onClick={() => handleStartDeposit("mobile")}
                disabled={!selectedOperator || !amount || !phoneNumber || isLoading}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.97]"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <span>Initier le Dépôt</span>}
              </Button>
            </div>
          </TabsContent>

          {/* --- CARD --- */}
          <TabsContent value="card" key="card-content" className="space-y-6 mt-8">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                    <Lock size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest"><span>Paiement Sécurisé</span></span>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2"><span>Numéro de Carte</span></label>
                        <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <Input
                                placeholder="0000 0000 0000 0000"
                                value={cardInfo.number}
                                onChange={(e) => setCardInfo({...cardInfo, number: e.target.value})}
                                className="h-16 bg-white/5 border-white/10 rounded-2xl pl-12 text-white font-mono outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2"><span>Expiration</span></label>
                            <Input
                                placeholder="MM/YY"
                                value={cardInfo.expiry}
                                onChange={(e) => setCardInfo({...cardInfo, expiry: e.target.value})}
                                className="h-16 bg-white/5 border-white/10 rounded-2xl px-4 text-white text-center font-mono outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2"><span>CVC</span></label>
                            <Input
                                placeholder="000"
                                value={cardInfo.cvc}
                                onChange={(e) => setCardInfo({...cardInfo, cvc: e.target.value})}
                                className="h-16 bg-white/5 border-white/10 rounded-2xl px-4 text-white text-center font-mono outline-none"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={() => handleStartDeposit("card")}
                        disabled={!cardInfo.number || !cardInfo.expiry || !cardInfo.cvc || !amount || isLoading}
                        className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-[0.97]"
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <span>Vérifier la Carte</span>}
                    </Button>
                </div>
            </div>
          </TabsContent>

          {/* --- CRYPTO --- */}
          <TabsContent value="crypto" key="crypto-content" className="mt-8 space-y-6">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-xl">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2"><span>Adresse Pi Network (PimPay)</span></label>
                        <div className="relative">
                            <div className="bg-black/60 border border-blue-500/30 rounded-2xl p-5 pr-14 break-all font-mono text-[10px] text-blue-100 shadow-inner">
                                {PIMPAY_WALLET_ADDRESS}
                            </div>
                            <button onClick={handleCopyAddress} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-xl text-white shadow-lg active:scale-90 transition-transform">
                                {copied ? <Check size={16}/> : <Copy size={16}/>}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-white/60 uppercase ml-2 tracking-widest"><span>Transaction Hash (ID)</span></label>
                        <Input
                            placeholder="Coller l'ID de transaction Pi..."
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 font-mono text-xs text-white outline-none"
                        />
                    </div>

                    <Button
                        onClick={() => handleStartDeposit("crypto")}
                        disabled={!txHash || !amount || isLoading}
                        className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.97]"
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <span>Confirmer le Dépôt</span>}
                    </Button>
                </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* FOOTER STATS */}
        <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 backdrop-blur-sm shadow-inner text-center">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest"><span>Temps Estimé</span></p>
                <p className="text-lg font-black text-white mt-1"><span>~3-5 Min</span></p>
            </div>
            <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 backdrop-blur-sm shadow-inner text-center">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest"><span>Frais Réseau</span></p>
                <p className="text-lg font-black text-emerald-400 mt-1"><span>0.00%</span></p>
            </div>
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
