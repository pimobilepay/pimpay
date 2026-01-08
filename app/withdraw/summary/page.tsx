"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SummaryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const rawData = searchParams.get("data");
    if (rawData) {
      setData(JSON.parse(atob(rawData)));
    }
  }, [searchParams]);

  const confirmCashout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/transaction/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.push("/withdraw/success");
      } else {
        router.push("/withdraw/failed");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
      setLoading(false);
    }
  };

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 font-sans">
      <div className="max-w-md mx-auto pt-10">
        <Link href="/withdraw" className="flex items-center gap-2 text-slate-400 mb-8 uppercase text-[10px] font-black tracking-widest">
          <ArrowLeft size={16} /> Retour
        </Link>

        <h1 className="text-3xl font-black text-white italic uppercase mb-2">Résumé</h1>
        <p className="text-blue-500 text-[10px] font-black uppercase tracking-[3px] mb-8">Vérification finale</p>

        <Card className="bg-slate-900/60 border-white/10 rounded-[2.5rem] p-8 space-y-6 backdrop-blur-md">
          <div className="space-y-4">
            <div className="flex justify-between border-b border-white/5 pb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Montant Pi</span>
              <span className="text-xl font-black text-white italic">{data.amount} π</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Conversion</span>
              <span className="text-xl font-black text-blue-400 italic">{data.fiatAmount.toLocaleString()} {data.currency}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Méthode</span>
              <span className="text-sm font-black text-white uppercase">{data.method}</span>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Bénéficiaire</span>
              <span className="text-xs font-mono text-slate-300 break-all">
                {data.method === 'mobile' ? data.details.phone : data.details.iban}
              </span>
            </div>
          </div>

          <Button 
            onClick={confirmCashout}
            disabled={loading}
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Confirmer l'envoi"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
