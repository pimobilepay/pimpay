"use client";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FailedPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
      <div className="space-y-6">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
          <XCircle size={48} className="text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-white uppercase italic">Échec du retrait</h2>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Une erreur est survenue lors du traitement. Veuillez vérifier votre solde ou réessayer.
        </p>
        <Button onClick={() => router.push('/withdraw')} className="w-full h-14 bg-red-600 text-white rounded-2xl font-black uppercase">
          Réessayer
        </Button>
      </div>
    </div>
  );
}
