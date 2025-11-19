"use client";

import { useState } from "react";
import { ArrowLeft, Wallet, CreditCard, DollarSign, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MPayPaymentMethod() {
  const router = useRouter();
  const params = useSearchParams();

  const amount = params.get("amount") || "0";
  const receiver = params.get("to") || "";

  const [selected, setSelected] = useState("wallet");

  const methods = [
    {
      id: "wallet",
      title: "Wallet (Pi)",
      description: "Solde disponible en π Network",
      icon: <Wallet size={26} />,
    },
    {
      id: "usd",
      title: "Solde USD",
      description: "Payer avec votre solde en dollars",
      icon: <DollarSign size={26} />,
    },
    {
      id: "card",
      title: "Carte bancaire",
      description: "Visa, Mastercard, toutes cartes",
      icon: <CreditCard size={26} />,
    },
    {
      id: "external",
      title: "Pi Wallet Externe",
      description: "Payer via un portefeuille externe",
      icon: <Wallet size={26} />,
    },
  ];

  const handleContinue = () => {
    router.push(
      `/mpay/confirm?to=${receiver}&amount=${amount}&method=${selected}`
    );
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

        <h1 className="text-xl font-bold text-foreground">Méthode de paiement</h1>
      </div>

      {/* MONTANT */}
      <div className="mb-6 text-center">
        <p className="text-muted-foreground">Montant à envoyer</p>
        <h2 className="text-4xl font-bold text-foreground">{amount} π</h2>
      </div>

      {/* MÉTHODES */}
      <div className="space-y-4">
        {methods.map((m) => {
          const active = selected === m.id;

          return (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={`
                w-full flex items-center justify-between p-4 rounded-xl
                transition-all active:scale-[0.98]
                border backdrop-blur-xl

                ${
                  active
                    ? "bg-blue-500/20 border-blue-500/40 shadow-lg"
                    : "bg-white/5 dark:bg-white/5 border-white/10"
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`
                    p-3 rounded-xl transition-all
                    ${
                      active
                        ? "bg-blue-500 text-white"
                        : "bg-white/10 text-foreground"
                    }
                  `}
                >
                  {m.icon}
                </div>

                <div className="text-left">
                  <p className="text-foreground font-semibold">{m.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.description}
                  </p>
                </div>
              </div>

              <ChevronRight
                size={22}
                className={`transition ${
                  active ? "text-blue-500" : "text-muted-foreground"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* BOUTON CONTINUER */}
      <button
        onClick={handleContinue}
        className="
          w-full mt-10 py-4 rounded-xl text-lg font-semibold
          bg-gradient-to-br from-blue-600 to-blue-400
          shadow-lg text-white active:scale-95 transition
        "
      >
        Continuer
      </button>
    </div>
  );
}
