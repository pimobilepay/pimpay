"use client";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
      <div className="space-y-6">
        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
          <CheckCircle2 size={48} className="text-emerald-500" />
        </div>
        <h2 className="text-1xl font-black text-white uppercase italic">Demande Reçue</h2>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Votre retrait est en attente de validation par l'administration **Pimpay**.
        </p>
        <Button onClick={() => router.push('/dashboard')} className="w-full h-14 bg-slate-900 border border-white/10 text-white rounded-2xl font-black uppercase">
          Tableau de Bord
        </Button>
      </div>
    </div>
  );
}
