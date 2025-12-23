"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import { 
  ArrowLeft, CircleDot, ArrowDownToLine, Smartphone, 
  CreditCard, Bitcoin, ShieldCheck, Zap, Info 
} from "lucide-react";
import Link from "next/link";
import { CountrySelect } from "@/components/country-select";
import { countries, type Country } from "@/lib/country-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "flag-icons/css/flag-icons.min.css";

export default function DepositPage() {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0],
  );
  const [selectedOperator, setSelectedOperator] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const piPrice = 314159.0;
  
  // Calculs sécurisés pour l'hydration
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

        {/* INFO CARD DESIGN */}
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
                Déposez des fonds via Mobile Money, Carte ou Crypto pour alimenter votre Ledger Pi.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-8">
        <Tabs defaultValue="mobile" className="w-full">
          {/* TABS DESIGN ENGINE */}
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
            <div className="space-y-6">
              {/* PAYS ET OPERATEUR */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2 px-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Région / Pays</label>
                  <CountrySelect value={selectedCountry} onChange={setSelectedCountry} />
                </div>

                <div className="space-y-2 px-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Opérateur</label>
                  <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                    <SelectTrigger className="h-14 bg-slate-900/40 border-white/5 rounded-2xl px-6 text-xs font-bold text-white focus:ring-0">
                      <SelectValue placeholder="Choisir un opérateur" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white rounded-2xl">
                      {selectedCountry.mobileMoneyOperators.map((operator: any) => (
                        <SelectItem key={operator.providerCode || operator} value={operator.providerCode || operator} className="focus:bg-blue-600 rounded-xl">
                          <span className={`fi fi-${selectedCountry.code.toLowerCase()} mr-2`}></span>
                          {operator.name || operator}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* TELEPHONE */}
              <div className="space-y-2 px-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Numéro Mobile Money</label>
                <div className="flex gap-3">
                  <div className="h-14 w-20 flex items-center justify-center bg-slate-900/40 border border-white/5 rounded-2xl text-xs font-bold text-slate-400">
                    {selectedCountry.dialCode}
                  </div>
                  <Input
                    type="tel"
                    placeholder="Numéro"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-14 bg-slate-900/40 border-white/5 rounded-2xl px-6 text-sm font-bold text-white placeholder:text-slate-700 focus:border-blue-500/30"
                  />
                </div>
              </div>

              {/* MONTANT */}
              <div className="space-y-2 px-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Montant (USD)</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-16 bg-slate-900/40 border-white/5 rounded-2xl px-6 text-xl font-black text-white placeholder:text-slate-700 focus:border-blue-500/30"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-500 font-black text-xs">USD</span>
                </div>

                {amount && (
                  <div className="mt-4 p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Conversion Pi</p>
                      <p className="text-sm font-black text-blue-400">π {getPiAmount()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Local Est.</p>
                      <p className="text-sm font-black text-white">{getLocalAmount()} {selectedCountry.currency}</p>
                    </div>
                  </div>
                )}
              </div>

              <Button className="w-full h-20 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] shadow-xl shadow-blue-600/20 group transition-all mt-4">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black uppercase tracking-[4px]">Initialiser le Dépôt</span>
                  <span className="text-[9px] font-bold text-blue-200 uppercase opacity-60">Instant processing</span>
                </div>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="card" className="mt-8 text-center py-12 border border-dashed border-white/5 rounded-[2rem]">
            <CreditCard size={32} className="mx-auto text-slate-700 mb-4" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paiement par carte bientôt disponible</p>
          </TabsContent>

          <TabsContent value="crypto" className="mt-8 text-center py-12 border border-dashed border-white/5 rounded-[2rem]">
            <Bitcoin size={32} className="mx-auto text-slate-700 mb-4" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paiement Crypto bientôt disponible</p>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
