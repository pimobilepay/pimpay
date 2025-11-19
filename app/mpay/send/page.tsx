"use client";

import { useState } from "react";
import { ArrowLeft, QrCode, User, Send } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MPaySendPage() {
  const router = useRouter();

  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");

  // Ajout d’un chiffre sur le clavier
  const handleNumberPress = (num: string) => {
    if (num === "del") {
      setAmount((prev) => prev.slice(0, -1));
    } else {
      setAmount((prev) => prev + num);
    }
  };

  const isValid = receiver.length > 2 && parseFloat(amount || "0") > 0;

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

        <h1 className="text-xl font-bold text-foreground">Envoyer un paiement</h1>
      </div>

      {/* RECEIVER INPUT */}
      <div
        className="
          bg-white/10 dark:bg-white/5
          border border-white/20
          backdrop-blur-xl rounded-xl p-4 mb-6
          flex items-center gap-3
        "
      >
        <User className="text-primary" size={22} />

        <input
          type="text"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
          placeholder="ID du destinataire"
          className="
            w-full bg-transparent outline-none
            text-foreground placeholder:text-muted-foreground
          "
        />

        {/* Bouton scanner QR */}
        <button
          onClick={() => router.push("/mpay/scanner")}
          className="p-2 bg-white/10 rounded-lg"
        >
          <QrCode size={20} className="text-primary" />
        </button>
      </div>

      {/* DISPLAY MONTANT */}
      <div className="text-center mb-8">
        <p className="text-sm text-muted-foreground">Montant à envoyer</p>

        <h2 className="text-5xl font-bold text-foreground tracking-wide mt-2">
          {amount ? amount : "0"}
          <span className="text-primary"> π</span>
        </h2>
      </div>

      {/* NUMPAD */}
      <div className="grid grid-cols-3 gap-4 text-center">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map(
          (item) => (
            <button
              key={item}
              onClick={() => handleNumberPress(item)}
              className="
                py-4 rounded-xl text-xl font-semibold
                bg-white/10 hover:bg-white/20
                dark:bg-white/5 dark:hover:bg-white/10
                backdrop-blur-xl transition
              "
            >
              {item === "del" ? "⌫" : item}
            </button>
          )
        )}
      </div>

      {/* SEND BUTTON */}
      <button
        disabled={!isValid}
        className={`
          w-full mt-10 py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3
          transition-all duration-200
          ${
            isValid
              ? "bg-gradient-to-br from-blue-500 to-blue-300 text-white shadow-lg active:scale-95"
              : "bg-gray-400/30 text-gray-600 dark:text-gray-500 cursor-not-allowed"
          }
        `}
      >
        <Send size={22} />
        Envoyer
      </button>
    </div>
  );
}
