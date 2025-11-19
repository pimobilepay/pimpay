"use client";

import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ChangePinPage() {
  const router = useRouter();

  const [step, setStep] = useState(1); // 1 = ancien PIN, 2 = nouveau PIN, 3 = confirmation
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [shake, setShake] = useState(false);

  // Vérifie si le PIN actuel correspond à celui enregistré (exemple)
  const storedPin = "1234"; // Tu remplaceras par une vraie API plus tard

  const handleNumberPress = (num) => {
    if (shake) return;

    if (step === 1 && oldPin.length < 4) {
      setOldPin(oldPin + num);
    }
    if (step === 2 && newPin.length < 4) {
      setNewPin(newPin + num);
    }
    if (step === 3 && confirmPin.length < 4) {
      setConfirmPin(confirmPin + num);
    }
  };

  const deleteDigit = () => {
    if (step === 1) setOldPin(oldPin.slice(0, -1));
    if (step === 2) setNewPin(newPin.slice(0, -1));
    if (step === 3) setConfirmPin(confirmPin.slice(0, -1));
  };

  const validateStep = () => {
    // STEP 1 → Vérifier l'ancien PIN
    if (step === 1) {
      if (oldPin === storedPin) {
        setStep(2);
        setOldPin("");
      } else {
        triggerShake();
        setOldPin("");
      }
      return;
    }

    // STEP 2 → Nouveau PIN doit être différent
    if (step === 2 && newPin.length === 4) {
      if (newPin === storedPin) {
        triggerShake();
        setNewPin("");
        return;
      }
      setStep(3);
      return;
    }

    // STEP 3 → Vérifier confirmation
    if (step === 3 && confirmPin.length === 4) {
      if (confirmPin === newPin) {
        alert("🎉 Nouveau PIN enregistré !");
        router.back();
      } else {
        triggerShake();
        setConfirmPin("");
      }
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const getPinDisplay = () => {
    const pin = step === 1 ? oldPin : step === 2 ? newPin : confirmPin;
    return (
      <div className="flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`
              w-5 h-5 rounded-full border 
              ${pin[i] ? "bg-blue-500 border-blue-500" : "border-gray-500 dark:border-gray-300"}
              transition-all
            `}
          ></div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-5 pb-24">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md"
        >
          <ArrowLeft className="text-foreground" size={22} />
        </button>
        <h1 className="text-xl font-bold text-foreground">Modifier le code PIN</h1>
      </div>

      {/* CARD PRINCIPALE */}
      <div
        className={`
          bg-white/5 dark:bg-white/5 
          backdrop-blur-xl p-6 rounded-2xl 
          border border-white/10
          shadow-[0_8px_25px_rgba(0,0,0,0.15)]
          transition-all
          ${shake ? "animate-[shake_0.3s]" : ""}
        `}
      >
        <div className="flex flex-col items-center text-center space-y-4">

          <ShieldCheck className="text-blue-500" size={42} />

          <h2 className="text-lg font-semibold text-foreground">
            {step === 1 && "Entrer votre ancien code PIN"}
            {step === 2 && "Créer un nouveau PIN"}
            {step === 3 && "Confirmer le nouveau PIN"}
          </h2>

          {getPinDisplay()}
        </div>
      </div>

      {/* CLAVIER NUMÉRIQUE */}
      <div className="grid grid-cols-3 gap-4 mt-10 px-6">

        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <KeyButton key={num} number={num} onPress={handleNumberPress} />
        ))}

        {/* VIDE */}
        <div></div>

        {/* ZERO */}
        <KeyButton number={0} onPress={handleNumberPress} />

        {/* SUPPRIMER */}
        <button
          onClick={deleteDigit}
          className="p-4 text-lg text-gray-400 dark:text-gray-200"
        >
          ⌫
        </button>
      </div>

      {/* CONFIRM BUTTON */}
      <button
        onClick={validateStep}
        className="
          w-full mt-10 py-3 
          bg-blue-600 hover:bg-blue-700 
          text-white font-semibold
          rounded-xl shadow-lg active:scale-95
          transition
        "
      >
        Continuer
      </button>

      {/* ANIMATION SHAKE CSS */}
      <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
          75% { transform: translateX(-6px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   KEYBOARD BUTTON
============================================================ */

function KeyButton({ number, onPress }) {
  return (
    <button
      onClick={() => onPress(number)}
      className="
        h-16 flex items-center justify-center
        rounded-xl text-xl font-semibold
        bg-white/10 dark:bg-white/5
        hover:bg-white/20 dark:hover:bg-white/10
        active:scale-95 transition
        text-foreground
      "
    >
      {number}
    </button>
  );
}
