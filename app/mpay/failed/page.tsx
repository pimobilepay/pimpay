"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

export default function MPayFailedPage() {
  const router = useRouter();
  const params = useSearchParams();

  const amount = params.get("amount") || "—";
  const receiver = params.get("to") || "—";

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 150);
  }, []);

  return (
    <div className="p-6 pt-24 pb-24">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>

        <h1 className="text-xl font-bold text-foreground">
          Paiement échoué
        </h1>
      </div>

      {/* ANIMATION ÉCHEC */}
      <div className="flex justify-center mb-8">
        <div className="relative">

          {/* Halo rouge animé */}
          <div
            className={`
              absolute inset-0 rounded-full blur-3xl
              bg-red-500/40 dark:bg-red-400/40
              transition-all duration-700
              ${animate ? "opacity-40 scale-110" : "opacity-0 scale-75"}
            `}
          ></div>

          {/* Icône centrale */}
          <div
            className={`
              w-40 h-40 rounded-full flex items-center justify-center
              bg-gradient-to-br from-red-500 to-red-400
              shadow-[0_0_35px_rgba(255,0,0,0.45)]
              transition-all duration-700
              ${animate ? "scale-100 opacity-100" : "scale-50 opacity-0"}
            `}
          >
            <AlertTriangle size={95} className="text-white" />
          </div>
        </div>
      </div>

      {/* TITRE */}
      <h1 className="text-center text-3xl font-bold text-foreground">
        Échec du paiement
      </h1>

      <p className="text-center text-muted-foreground mt-2">
        Une erreur inattendue s’est produite lors de la transaction.
      </p>

      {/* INFO */}
      <div
        className="
          mt-8 p-6 rounded-2xl
          bg-white/10 dark:bg-white/5
          backdrop-blur-xl
          border border-white/20 dark:border-white/10
          shadow-[0_5px_20px_rgba(0,0,0,0.25)]
          space-y-4
        "
      >
        <div className="flex justify-between">
          <span className="text-muted-foreground">Destinataire</span>
          <span className="text-foreground font-semibold">{receiver}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Montant</span>
          <span className="text-foreground font-bold text-lg">
            {amount} π
          </span>
        </div>
      </div>

      {/* BOUTON RÉESSAYER */}
      <button
        onClick={() => router.push(`/mpay/send?to=${receiver}&amount=${amount}`)}
        className="
          w-full mt-10 py-4 rounded-xl text-lg font-semibold
          flex items-center justify-center gap-3
          bg-gradient-to-br from-red-500 to-red-400
          text-white shadow-lg active:scale-95 transition
        "
      >
        <RotateCcw size={22} />
        Réessayer
      </button>

      {/* BOUTON RETOUR */}
      <button
        onClick={() => router.push("/")}
        className="
          w-full mt-3 py-4 rounded-xl text-lg font-semibold
          bg-white/10 dark:bg-white/5
          border border-white/20 dark:border-white/10
          backdrop-blur-xl
          text-foreground active:scale-95 transition
        "
      >
        Retour à l’accueil
      </button>
    </div>
  );
}
