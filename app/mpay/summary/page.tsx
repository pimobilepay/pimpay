"use client";

import { ArrowLeft, Wallet, DollarSign, CreditCard, ScanLine } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MPaySummary() {
  const router = useRouter();
  const params = useSearchParams();

  const amount = params.get("amount") || "0";
  const receiver = params.get("to") || "Utilisateur";
  const method = params.get("method") || "wallet";

  const transactionFee = 0.02; // 2% frais
  const totalAmount = (parseFloat(amount) + parseFloat(amount) * transactionFee).toFixed(2);

  const methodDisplay = {
    wallet: {
      name: "Wallet (Pi)",
      icon: <Wallet size={28} className="text-blue-500" />,
    },
    usd: {
      name: "Solde USD",
      icon: <DollarSign size={28} className="text-green-500" />,
    },
    card: {
      name: "Carte Bancaire",
      icon: <CreditCard size={28} className="text-yellow-500" />,
    },
    external: {
      name: "Pi Wallet Externe",
      icon: <ScanLine size={28} className="text-purple-500" />,
    },
  };

  const handleConfirm = () => {
    router.push(`/mpay/confirm?to=${receiver}&amount=${amount}&method=${method}`);
  };

  return (
    <div className="px-6 pt-24 pb-24">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>

        <h1 className="text-xl font-bold text-foreground">
          Résumé du paiement
        </h1>
      </div>

      {/* CARD PRINCIPALE */}
      <div
        className="
          bg-white/10 dark:bg-white/5 
          backdrop-blur-xl rounded-2xl p-6
          border border-white/20 dark:border-white/10
          shadow-xl
        "
      >
        {/* DESTINATAIRE */}
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">Destinataire</p>
          <h2 className="text-xl font-semibold text-foreground">{receiver}</h2>
        </div>

        {/* MONTANT */}
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">Montant</p>
          <h2 className="text-3xl font-bold text-foreground">{amount} π</h2>
        </div>

        {/* FRAIS + TOTAL */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-foreground">
            <span>Frais de transaction (2%)</span>
            <span>{(parseFloat(amount) * transactionFee).toFixed(2)} π</span>
          </div>

          <div className="flex justify-between text-xl font-semibold text-foreground mt-3">
            <span>Total</span>
            <span>{totalAmount} π</span>
          </div>
        </div>

        {/* MÉTHODE DE PAIEMENT */}
        <div className="mt-8">
          <p className="text-muted-foreground text-sm">Méthode de paiement</p>

          <div
            className="
              mt-2 p-4 flex items-center gap-4 rounded-xl
              bg-white/5 border border-white/10
            "
          >
            {methodDisplay[method]?.icon}
            <span className="text-lg font-medium text-foreground">
              {methodDisplay[method]?.name}
            </span>
          </div>
        </div>

        {/* ID TRANSACTION */}
        <div className="mt-8">
          <p className="text-muted-foreground text-sm">ID transaction provisoire</p>
          <p className="text-foreground font-mono text-sm mt-1">
            TX-{Math.floor(Math.random() * 999999999)}
          </p>
        </div>
      </div>

      {/* BOUTON CONFIRMER */}
      <button
        onClick={handleConfirm}
        className="
          w-full mt-8 py-4 rounded-xl text-lg font-semibold
          bg-gradient-to-br from-blue-600 to-blue-400
          shadow-lg text-white active:scale-95 transition
        "
      >
        Confirmer le paiement
      </button>
    </div>
  );
}
