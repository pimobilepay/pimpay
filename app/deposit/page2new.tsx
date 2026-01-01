"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft, CircleDot, ArrowDownToLine, Smartphone,
  CreditCard, Bitcoin, ShieldCheck, Copy, Check, Coins, Zap
} from "lucide-react";
import Link from "next/link";
import { CountrySelect } from "@/components/country-select";
import { countries, type Country } from "@/lib/country-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Flag from "react-world-flags";

const PI_GCV_PRICE = 314159; 

export default function DepositPage() {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // État pour le pays sélectionné (par défaut Congo DRC via votre liste)
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0]
  );
  
  const [selectedOperator, setSelectedOperator] = useState("");
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState("");

  const PIMPAY_WALLET_ADDRESS = "GD3SGMIZH6NAQ3RY7KQZDSSDHTN2K2HFKRRPEVAWWFJGL4CZ7MXW7UQR";

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePiToReceive = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return "0.000000";
    return (val / PI_GCV_PRICE).toFixed(8);
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

        <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <ArrowDownToLine size={80} className="text-blue-500" />
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none">Sécurité Garantie</p>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed font-medium italic">
                Transaction cryptée & sécurisée
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-8">
        <Tabs defaultValue="mobile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-900/80 border border-white/10 rounded-2xl p-1 shadow-md">
            <TabsTrigger value="mobile" className="rounded-xl font-bold text-[10px] uppercase tracking-wider text-slate-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <Smartphone size={14} className="mr-2" /> Mobile
            </TabsTrigger>
            <TabsTrigger value="card" className="rounded-xl font-bold text-[10px] uppercase tracking-wider text-slate-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <CreditCard size={14} className="mr-2" /> Carte
            </TabsTrigger>
            <TabsTrigger value="crypto" className="rounded-xl font-bold text-[10px] uppercase tracking-wider text-slate-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <Bitcoin size={14} className="mr-2" /> Crypto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mobile" className="space-y-6 mt-8">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-xl relative overflow-hidden">
              
              {/* Sélecteur de Pays */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Région / Pays</label>
                <div className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-2xl p-2 px-3 h-16 transition-all focus-within:border-blue-500/50">
                   <div className="w-9 h-9 flex items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-800 shrink-0">
                      <Flag code={selectedCountry.code} className="w-full h-full object-cover scale-110" />
                   </div>
                   <div className="flex-1 overflow-hidden">
                      <CountrySelect 
                        value={selectedCountry} 
                        onChange={(country) => {
                          setSelectedCountry(country);
                          setSelectedOperator(""); // Reset l'opérateur quand le pays change
                        }}
                        options={countries}
                      />
                   </div>
                </div>
              </div>

              {/* Montant USD */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Montant (USD)</label>
                <div className="relative">
                  <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-16 bg-white/5 border-white/10 rounded-2xl pl-12 text-white font-black text-xl focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-between items-center px-2 mt-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Conversion marché</span>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">≈ {calculatePiToReceive()} PI</span>
                </div>
              </div>

              {/* Opérateurs Dynamiques selon le pays sélectionné */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Opérateur Mobile</label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-2xl px-4 text-white focus:border-blue-500">
                    <SelectValue placeholder={selectedCountry.operators.length > 0 ? "Choisir un réseau" : "Indisponible dans ce pays"} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 text-white rounded-2xl">
                    {selectedCountry.operators.map((op) => (
                      <SelectItem key={op.id} value={op.id} className="focus:bg-blue-600 rounded-xl py-3">
                        <div className="flex items-center gap-3">
                          <img src={op.icon} alt={op.name} className="w-6 h-6 object-contain rounded bg-white p-0.5" />
                          <span className="font-bold text-xs uppercase">{op.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Téléphone avec Indicatif Dynamique */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white uppercase tracking-widest ml-2 opacity-80">Numéro de téléphone</label>
                <div className="flex gap-2">
                    <div className="h-16 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl px-3 min-w-[85px] shadow-inner">
                        <span className="text-blue-500 font-black text-sm italic tracking-tighter">
                          {selectedCountry.dialCode}
                        </span>
                    </div>
                    <div className="relative flex-1">
                        <Input 
                            type="tel"
                            placeholder="Ex: 812345678"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-white font-black text-lg focus:border-blue-500"
                        />
                    </div>
                </div>
              </div>

              <Button 
                disabled={!selectedOperator || !amount}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all"
              >
                Démarrer le dépôt
              </Button>
            </div>
          </TabsContent>

          {/* Crypto Content */}
          <TabsContent value="crypto" className="mt-8 space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
              <div className="text-center">
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">Pi Mainnet Gateway</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-white uppercase ml-2 tracking-widest italic opacity-80">Wallet PimPay</label>
                    <div className="relative">
                        <div className="bg-black/40 border border-blue-500/20 rounded-2xl p-5 pr-14 break-all font-mono text-[10px] text-blue-100 min-h-[70px] flex items-center shadow-inner">
                            {PIMPAY_WALLET_ADDRESS}
                        </div>
                        <button onClick={handleCopyAddress} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-xl text-white shadow-lg active:scale-90 transition-all">
                            {copied ? <Check size={16}/> : <Copy size={16}/>}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] font-black text-white uppercase ml-2 tracking-widest italic opacity-80">Hash de la transaction</label>
                    <Input
                        placeholder="Coller le hash ici..."
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 font-mono text-xs text-white focus:border-blue-500 placeholder:text-slate-700"
                    />
                </div>

                <Button className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl">
                  Vérifier mon dépôt
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* PimPay Protocol Footer */}
        <div className="pt-8 border-t border-white/5">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-500">
                    <Zap size={18} fill="currentColor" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-tighter italic">PimPay Protocol</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/5 p-5 rounded-[2rem]">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Temps Moyen</p>
                    <p className="text-lg font-black text-white mt-1">2-5 Min</p>
                </div>
                <div className="bg-white/5 border border-white/5 p-5 rounded-[2rem]">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Frais</p>
                    <p className="text-lg font-black text-blue-400 mt-1">0.00%</p>
                </div>
            </div>
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
