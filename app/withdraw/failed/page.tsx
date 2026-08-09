"use client";
import { Button } from "@/components/ui/button";
import { XCircle, Clock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // [FIX] Retrait Mobile Money suspendu par l'admin (interrupteur "Bientôt
  // disponible") : distinct d'un échec technique, message dédié sans laisser
  // penser à l'utilisateur qu'il y a un problème avec son solde ou son compte.
  const isComingSoon = searchParams.get("reason") === "coming_soon";

  if (isComingSoon) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
        <div className="space-y-6">
          <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
            <Clock size={48} className="text-amber-400" />
          </div>
          <h2 className="text-1xl font-black text-white uppercase italic">Bientôt disponible</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Le retrait vers Mobile Money est momentanément indisponible. Merci de réessayer un peu plus tard.
          </p>
          <Button onClick={() => router.push('/withdraw')} className="w-full h-14 bg-amber-500 text-black rounded-2xl font-black uppercase">
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
      <div className="space-y-6">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
          <XCircle size={48} className="text-red-500" />
        </div>
        <h2 className="text-1xl font-black text-white uppercase italic">Échec du retrait</h2>
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

export default function FailedPage() {
  return (
    <Suspense fallback={null}>
      <FailedContent />
    </Suspense>
  );
}
