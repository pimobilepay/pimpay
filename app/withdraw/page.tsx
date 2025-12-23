"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import { 
  ArrowLeft, ArrowUpFromLine, Smartphone, Building2, 
  Clock, ShieldCheck, Zap, CircleDot 
} from "lucide-react";
import Link from "next/link";
import { CountrySelect } from "@/components/country-select";
import { countries, type Country } from "@/lib/country-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "flag-icons/css/flag-icons.min.css";

export default function WithdrawPage() {
  const [mounted, setMounted] = useState(false);
  const [piAmount, setPiAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0],
  );
  const [selectedOperator, setSelectedOperator] = useState("");
  const [balance, setBalance] = useState<number>(250.75);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setLoadingBalance(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const piPrice = 314159.0;

  // Formattage stable pour l'hydratation (Zéro Italique)
  const formatValue = (val: number, locale: string = "en-US") => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans selection:bg-blue-500/30">
      
      {/* HEADER FINTECH - TITRE EN HAUT / LEDGER EN BAS */}
      <div className="px-6 pt-12 pb-16 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
              <ArrowLeft size={20} />
            </div>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Retrait</h1>
            <div className="flex items-center gap-2 mt-1">
              <CircleDot size={10} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Ledger Liquidation</span>
            </div>
          </div>
        </div>

        {/* BALANCE CARD CORE ENGINE */}
        <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <ArrowUpFromLine size={80} className="text-blue-500" />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Available to Withdraw</p>
              <p className="text-3xl font-black text-white tracking-tighter">
                {loadingBalance ? "..." : `π ${formatValue(balance)}`}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
              <Zap size={20} />
            </div>
          </div>
        </Card>
      </div>

      <div className="px-6 -mt-8 space-y-8">
        <Tabs defaultValue="mobile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-900/50 border border-white/5 rounded-2xl p-1 backdrop-blur-md">
            <TabsTrigger value="mobile" className="rounded-xl font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Smartphone size={14} className="mr-2" /> Mobile
            </TabsTrigger>
            <TabsTrigger value="bank" className="rounded-xl font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Building2 size={14} className="mr-2" /> Bank
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Clock size={14} className="mr-2" /> Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mobile" className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-6">
              
              {/* PAYS & OPERATEUR */}
              <div className="grid grid-cols-1 gap-6 px-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Region</label>
                  <CountrySelect value={selectedCountry} onChange={setSelectedCountry} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Network Operator</label>
                  <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                    <SelectTrigger className="h-14 bg-slate-900/40 border-white/5 rounded-2xl px-6 text-xs font-bold text-white focus:ring-0">
                      <SelectValue placeholder="Choisir un opérateur" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white rounded-2xl">
                      {selectedCountry.mobileMoneyOperators?.map((op) => {
                        const name = typeof op === "string" ? op : op.name;
                        return (
                          <SelectItem key={name} value={name} className="focus:bg-blue-600 rounded-xl">
                             <span className={`fi fi-${selectedCountry.code.toLowerCase()} mr-2`} />
                             {name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* COORDONNEES */}
              <div className="space-y-2 px-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Receiving Number</label>
                <div className="flex gap-3">
                  <div className="h-14 w-20 flex items-center justify-center bg-slate-900/40 border border-white/5 rounded-2xl text-xs font-bold text-blue-400">
                    {selectedCountry.dialCode}
                  </div>
                  <Input
                    placeholder="Numéro de téléphone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 h-14 bg-slate-900/40 border-white/5 rounded-2xl px-6 text-sm font-bold text-white placeholder:text-slate-700 focus:border-blue-500/30"
                  />
                </div>
              </div>

              {/* MONTANT RETRAIT */}
              <div className="space-y-2 px-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Withdrawal Amount (π)</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={piAmount}
                    onChange={(e) => setPiAmount(e.target.value)}
                    className="h-16 bg-slate-900/40 border-white/5 rounded-2xl px-6 text-xl font-black text-white focus:border-blue-500/30"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-500 font-black text-xs uppercase">Pi Coin</span>
                </div>

                {piAmount && (
                  <div className="mt-4 p-5 bg-blue-600/5 border border-blue-500/10 rounded-[2rem] space-y-3 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Global Market (USD)</span>
                      <span className="text-sm font-bold text-white">$ {formatValue(Number(piAmount) * piPrice)}</span>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Net Cash Out</span>
                      <span className="text-xl font-black text-blue-400 tracking-tighter">
                        {formatValue(Number(piAmount) * selectedCountry.piToLocalRate, "fr-FR")} {selectedCountry.currency}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Button className="w-full h-20 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] shadow-xl shadow-blue-600/20 group transition-all mt-4">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black uppercase tracking-[4px]">Confirm Cashout</span>
                  <span className="text-[9px] font-bold text-blue-200 uppercase opacity-60">Settlement processing</span>
                </div>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="bank" className="mt-8">
            <div className="py-16 text-center border border-dashed border-white/5 rounded-[2rem] space-y-4">
              <Building2 size={32} className="mx-auto text-slate-700" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bank wire coming soon</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* SECURITY FOOTER */}
        <div className="p-5 bg-blue-600/5 border border-blue-500/10 rounded-[2rem] flex items-start gap-4">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Pimpay Security Protocol</p>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Toutes les transactions de retrait sont traitées via notre passerelle custodial sécurisée. 
              Le délai de réception dépend de votre opérateur local.
            </p>
          </div>
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
