"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function MPaySuccessPage() {
  const params = useSearchParams();
  const router = useRouter();

  const receiver = params.get("to");
  const amount = params.get("amount");

  const [animate, setAnimate] = useState(false);

  // Lance l'animation une fois la page chargée
  useEffect(() => {
    setTimeout(() => setAnimate(true), 200);
  }, []);

  return (
    <div className="p-6 pt-24 pb-24">

      {/* ANIMATION SUCCESS */}
      <div className="flex justify-center">
        <div className="relative">

          {/* Halo extérieur */}
          <div
            className={`
              absolute inset-0 rounded-full blur-3xl
              ${animate ? "opacity-30 scale-110" : "opacity-0 scale-75"}
              bg-blue-400/40 dark:bg-blue-300/40
              transition-all duration-700
            `}
          ></div>

          {/* Cercle interne */}
          <div
            className={`
              w-40 h-40 rounded-full flex items-center justify-center
              bg-gradient-to-br from-blue-500 to-blue-300
              shadow-[0_0_25px_rgba(0,150,255,0.6)]
              transition-all duration-700
              ${animate ? "scale-100 opacity-100" : "scale-50 opacity-0"}
            `}
          >
            <CheckCircle2 size={95} className="text-white" />
          </div>
        </div>
      </div>

      {/* TITRE */}
      <h1
        className="
          text-center text-3xl font-bold mt-8 
          text-foreground tracking-wide
        "
      >
        Paiement envoyé !
      </h1>

      {/* INFOS */}
      <p className="text-center text-muted-foreground mt-2">
        Votre transaction a été envoyée avec succès.
      </p>

      {/* RÉCAP */}
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

      {/* BOUTONS */}
      <button
        onClick={() => router.push(`/mpay/details?to=${receiver}&amount=${amount}`)}
        className="
          w-full mt-10 py-4 rounded-xl text-lg font-semibold
          flex items-center justify-center gap-3
          bg-white/10 dark:bg-white/5 backdrop-blur-xl
          border border-white/20 dark:border-white/10
          text-foreground active:scale-95 transition
        "
      >
        Voir les détails
        <ArrowRight size={20} />
      </button>

      <button
        onClick={() => router.push("/")}
        className="
          w-full mt-4 py-4 rounded-xl text-lg font-semibold
          bg-gradient-to-br from-blue-500 to-blue-300 text-white
          shadow-lg active:scale-95 transition
        "
      >
        Retour à l’accueil
      </button>
    </div>
  );
}
