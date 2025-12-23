"use client";                                     
import { useState, useEffect } from "react";      import { Card } from "@/components/ui/card";      import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";    import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, ArrowUpFromLine, Smartphone, Building2, Clock, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { CountrySelect } from "@/components/country-select";
import { countries, type Country } from "@/lib/country-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "flag-icons/css/flag-icons.min.css";

export default function WithdrawPage() {
  // Gestion de l'état d'hydratation
  const [mounted, setMounted] = useState(false);

  // États du formulaire
  const [piAmount, setPiAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0],
  );
  const [selectedOperator, setSelectedOperator] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // État du Wallet (Custodial)
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Simulation d'appel API pour le solde
    const fetchBalance = async () => {
      try {
        // Remplace par ton fetch réel : const res = await fetch('/api/wallet/balance')
        setBalance(250.75);
      } finally {
        setLoadingBalance(false);
      }
    };
    fetchBalance();
  }, []);

  const piPrice = 314159.0;

  // Calculs formatés pour éviter les erreurs d'hydratation
  const formattedUsd = piAmount
    ? (Number.parseFloat(piAmount) * piPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })
    : "0.00";

  const formattedLocal = piAmount
    ? (Number.parseFloat(piAmount) * selectedCountry.piToLocalRate).toLocaleString('fr-FR')
    : "0.00";

  // Empêcher le rendu désynchronisé
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      {/* Header Premium */}
      <div className="relative px-6 pt-12 pb-16 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent rounded-b-[3rem]">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <div className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 active:scale-90 transition-transform">
              <ArrowLeft size={20} />
            </div>
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase">Retrait Cash</h1>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[2px]">Pi vers Fiat</p>
          </div>
        </div>

        {/* Balance Card Dynamique */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[2.5rem] flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <span className="font-black text-black text-xl ">π</span>
            </div>
            <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Solde Disponible</p>
                <p className="text-xl font-black tracking-tight">
                  {loadingBalance ? "..." : `π ${balance.toLocaleString()}`}
                </p>
            </div>
          </div>
          <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
            <Zap size={16} className="animate-pulse" />
          </div>
        </Card>
      </div>

      <div className="px-6 -mt-8">
        <Tabs defaultValue="mobile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900/80 border border-white/5 p-1 h-14 rounded-2xl backdrop-blur-xl">
            <TabsTrigger value="mobile" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold text-[10px] uppercase tracking-tighter gap-2">
              <Smartphone size={14} /> Mobile
            </TabsTrigger>
            <TabsTrigger value="bank" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold text-[10px] uppercase tracking-tighter gap-2">
              <Building2 size={14} /> Banque
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-slate-800 data-[state=active]:text-white font-bold text-[10px] uppercase tracking-tighter gap-2">
              <Clock size={14} /> Historique
            </TabsTrigger>
          </TabsList>

          {/* Mobile Money Tab */}
          <TabsContent value="mobile" className="mt-8 space-y-6">
            <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-6 space-y-6 shadow-xl">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest">Pays & Devise</Label>
                <div className="flex items-center gap-3 px-4 h-14 bg-slate-950 border border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-all">
                   <div className="flex-shrink-0 border-r border-white/10 pr-3">
                     <span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-sm w-6 h-4 block`} />
                   </div>
                   <div className="flex-1 text-sm font-bold bg-transparent [&_button]:bg-transparent [&_button]:border-none [&_button]:p-0 [&_button]:h-auto [&_button]:text-white">
                     <CountrySelect value={selectedCountry} onChange={setSelectedCountry} />
                   </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest text-balance">Opérateur de paiement</Label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="h-14 bg-slate-950 border-white/10 rounded-2xl text-white font-bold px-4">
                    <SelectValue placeholder="Choisir un opérateur" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    {selectedCountry.mobileMoneyOperators?.map((op) => {
                      const name = typeof op === "string" ? op : op.name;
                      return <SelectItem key={name} value={name} className="focus:bg-blue-600 focus:text-white">{name}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest">Coordonnées de réception</Label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center h-14 w-20 bg-slate-950 border border-white/10 rounded-2xl font-bold text-blue-400">
                    {selectedCountry.dialCode}
                  </div>
                  <Input
                    placeholder="Numéro de téléphone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 h-14 bg-slate-950 border-white/10 rounded-2xl font-bold tracking-widest focus:border-blue-500 transition-all text-white"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest">Montant du retrait (π)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={piAmount}
                    onChange={(e) => setPiAmount(e.target.value)}
                    className="h-16 bg-slate-950 border-white/10 rounded-2xl text-2xl font-black italic pr-12 focus:border-blue-500 transition-all text-white"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-700 italic text-xl">π</div>
                </div>

                {piAmount && (
                  <div className="p-5 bg-gradient-to-r from-blue-600/10 to-transparent border border-blue-500/20 rounded-[2rem] space-y-2 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <span>Marché Global (USD)</span>
                      <span className="text-white">$ {formattedUsd}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Net à recevoir</span>
                      <span className="text-lg font-black text-blue-400 italic">{formattedLocal} {selectedCountry.currency}</span>
                    </div>
                  </div>
                )}
              </div>

              <Button className="w-full h-16 bg-blue-600 hover:bg-blue-500 rounded-[2rem] font-black italic text-lg shadow-xl shadow-blue-600/20 transition-all active:scale-95 uppercase">
                Valider le retrait
              </Button>
            </Card>
          </TabsContent>

          {/* Bank Tab & Historique (Simplifiés pour le design) */}
          <TabsContent value="bank" className="mt-8">
            <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-10 text-center space-y-4">
              <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-500 mx-auto">
                 <Building2 size={32} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Virement Bancaire Swift Bientôt disponible</p>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Sécurité */}
        <div className="mt-10 p-5 bg-blue-600/5 border border-blue-500/10 rounded-[2.5rem] flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Système Custodial Sécurisé</p>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
              Vos transactions sont protégées par le protocole de sécurité PiMPay. Traitement instantané.
            </p>
          </div>
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
