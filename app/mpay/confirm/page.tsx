"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Send, User, Coins, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function MPayConfirmPage() {
  const router = useRouter();
  const params = useSearchParams();

  // Les données envoyées depuis la page /mpay/send
  const receiver = params.get("to") || "destinataire inconnu";
  const amount = params.get("amount") || "0";

  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);

    // Simuler une attente serveur
    setTimeout(() => {
      router.push(
        `/mpay/success?to=${receiver}&amount=${amount}`
      );
    }, 1500);
  };

  return (
    <div className="p-6 pb-24">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 backdrop-blur-lg"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>

        <h1 className="text-xl font-bold text-foreground">
          Confirmation du paiement
        </h1>
      </div>

      {/* CARD PRINCIPALE */}
      <div
        className="
          p-6 rounded-2xl
          bg-white/10 dark:bg-white/5
          border border-white/20 dark:border-white/10
          backdrop-blur-xl
          shadow-[0_8px_28px_rgba(0,0,0,0.25)]
        "
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Vérifiez les informations
        </h2>

        {/* DESTINATAIRE */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <User className="text-primary" size={24} />
            <div>
              <p className="text-sm text-muted-foreground">Destinataire</p>
              <p className="text-base font-semibold text-foreground">
                {receiver}
              </p>
            </div>
          </div>
        </div>

        {/* MONTANT */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Coins className="text-primary" size={24} />
            <div>
              <p className="text-sm text-muted-foreground">Montant</p>
              <p className="text-xl font-bold text-foreground">
                {amount} <span className="text-primary">π</span>
              </p>
            </div>
          </div>
        </div>

        {/* DISPOSITION • NOTE • FUTURE LOGIQUE */}
        <p className="text-xs text-muted-foreground mt-2">
          Une fois confirmé, cette transaction sera envoyée de manière sécurisée
          via MPay.
        </p>
      </div>

      {/* BOUTON CONFIRMER */}
      <button
        onClick={handleConfirm}
        disabled={loading}
        className={`
          w-full mt-8 py-4 rounded-xl text-lg font-semibold
          flex items-center justify-center gap-3
          transition-all duration-200
          ${
            loading
              ? "bg-blue-400 text-white opacity-70 cursor-not-allowed"
              : "bg-gradient-to-br from-blue-500 to-blue-300 text-white shadow-lg active:scale-95"
          }
        `}
      >
        {loading ? (
          <CheckCircle2 className="animate-pulse" size={24} />
        ) : (
          <Send size={24} />
        )}
        {loading ? "Traitement..." : "Confirmer le paiement"}
      </button>

      {/* ANNULER */}
      <button
        onClick={() => router.back()}
        className="
          w-full mt-4 py-4 rounded-xl text-center
          bg-white/10 dark:bg-white/5
          text-foreground backdrop-blur-xl
          border border-white/20 dark:border-white/10
          active:scale-95 transition
        "
      >
        Annuler
      </button>
    </div>
  );
}
