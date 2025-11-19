"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ScanLine,
  QrCode,
  Send,
  Smartphone,
  Clock,
} from "lucide-react";

export default function MPayPage() {
  const router = useRouter();

  return (
    <div className="p-6 pb-28">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>

        <h1 className="text-xl font-bold text-foreground">MPay</h1>
      </div>

      {/* CARTE PRINCIPALE MPAY */}
      <div
        className="
          w-full rounded-3xl p-6 mb-8 relative overflow-hidden
          bg-gradient-to-br from-[#FADFB1] to-[#F5C26B]
          dark:from-[#2C210F] dark:to-[#3B2A15]
          shadow-[0_8px_30px_rgba(0,0,0,0.2)]
        "
      >
        {/* PI LOGO */}
        <div className="flex justify-center mb-3">
          <div
            className="
              w-20 h-20 rounded-full flex items-center justify-center 
              bg-white/20 dark:bg-black/20 backdrop-blur-md
              shadow-[0_0_20px_rgba(255,174,0,0.6)]
              border border-white/30 dark:border-white/10
            "
          >
            <span className="text-4xl font-bold text-[#8C4A00] dark:text-[#F5C26B]">
              π
            </span>
          </div>
        </div>

        <h2 className="text-center text-lg font-semibold text-[#7B4E0B] dark:text-[#EEC27A]">
          Solde MPay
        </h2>

        <p className="text-center text-4xl font-extrabold text-[#744200] dark:text-[#FFDFA7] mt-2 drop-shadow">
          125.82 π
        </p>

        <p className="text-center text-sm text-[#855f2c] dark:text-[#c9a873] mt-1">
          Dernière mise à jour il y a 2 min
        </p>
      </div>

      {/* BOUTONS D’ACTIONS */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <ActionButton
          icon={<ScanLine size={30} />}
          label="Scanner"
          onPress={() => router.push("/mpay/scanner")}
        />
        <ActionButton
          icon={<Send size={30} />}
          label="Payer"
          onPress={() => router.push("/mpay/send")}
        />
        <ActionButton
          icon={<QrCode size={30} />}
          label="Recevoir"
          onPress={() => router.push("/mpay/receive")}
        />
      </div>

      {/* TITRE SECTION */}
      <h3 className="text-lg font-bold text-foreground mb-3">
        Transactions MPay
      </h3>

      {/* LISTE TRANSACTIONS */}
      <div className="space-y-3">
        <TransactionItem
          name="Paiement Boutique"
          amount="-3.25 π"
          time="Il y a 10 min"
        />
        <TransactionItem
          name="Paiement Réception"
          amount="+12 π"
          time="Il y a 3h"
          positive
        />
        <TransactionItem
          name="Transfert"
          amount="-0.98 π"
          time="Hier"
        />
      </div>
    </div>
  );
}

/* ACTION BUTTON */
function ActionButton({ icon, label, onPress }) {
  return (
    <button
      onClick={onPress}
      className="
        flex flex-col items-center justify-center gap-2 
        p-4 rounded-2xl 
        bg-white/10 dark:bg-white/5 
        backdrop-blur-lg border border-white/20 dark:border-white/10
        shadow-md active:scale-95 transition
      "
    >
      <div className="text-blue-600 dark:text-blue-300">{icon}</div>
      <span className="text-sm text-foreground">{label}</span>
    </button>
  );
}

/* TRANSACTION COMPONENT */
function TransactionItem({ name, amount, time, positive = false }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl 
      bg-white/5 dark:bg-white/5 backdrop-blur-xl
      border border-white/10 shadow-sm
    ">
      <div className="flex items-center gap-3">
        <Smartphone className="text-blue-500 opacity-80" size={26} />
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock size={14} /> {time}
          </p>
        </div>
      </div>

      <span
        className={`
          font-semibold 
          ${positive ? "text-green-500" : "text-red-500"}
        `}
      >
        {amount}
      </span>
    </div>
  );
}
