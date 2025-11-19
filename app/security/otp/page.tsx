"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OTPPage() {
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [shake, setShake] = useState(false);
  const [timer, setTimer] = useState(30); // 30 sec avant renvoi du code
  const correctOTP = "123456"; // À remplacer plus tard par l’API

  // TIMER
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Ajouter un chiffre
  const handleNumberPress = (num: string) => {
    if (otp.length < 6) {
      setOtp(otp + num);
    }
  };

  // Suppression
  const deleteDigit = () => {
    setOtp(otp.slice(0, -1));
  };

  // Validation OTP
  const validateOtp = () => {
    if (otp.length < 6) return;

    if (otp === correctOTP) {
      alert("🎉 OTP Vérifié !");
      router.push("/security");
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setOtp("");
    }
  };

  // Renvoi OTP
  const resendOtp = () => {
    setTimer(30);
    alert("📨 Nouveau code OTP envoyé !");
  };

  return (
    <div className="p-6 pb-24">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md"
        >
          <ArrowLeft className="text-foreground" size={22} />
        </button>

        <h1 className="text-xl font-bold text-foreground">
          Vérification OTP
        </h1>
      </div>

      {/* CARD PRINCIPALE */}
      <div
        className={`
          bg-white/5 dark:bg-white/5 
          backdrop-blur-2xl p-6 rounded-2xl 
          border border-white/10
          shadow-[0_8px_28px_rgba(0,0,0,0.15)]
          ${shake ? "animate-[shake_0.3s]" : ""}
        `}
      >
        <div className="flex flex-col items-center space-y-4 text-center">

          <ShieldCheck size={42} className="text-blue-500" />

          <h2 className="text-lg font-semibold text-foreground">
            Entrer le code à 6 chiffres
          </h2>

          <p className="text-sm text-muted-foreground">
            Le code a été envoyé à votre numéro
          </p>

          {/* DISPLAY OTP */}
          <div className="flex gap-4 mt-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="
                  w-10 h-12 rounded-xl 
                  bg-white/10 dark:bg-white/5 
                  border border-white/20 dark:border-white/10
                  flex items-center justify-center 
                  text-xl font-semibold
                  text-foreground
                "
              >
                {otp[i] ?? ""}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* CLAVIER NUMÉRIQUE */}
      <div className="grid grid-cols-3 gap-4 my-10 px-8">

        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <KeyButton key={num} number={num} onPress={handleNumberPress} />
        ))}

        {/* VIDE */}
        <div></div>

        {/* 0 */}
        <KeyButton number={0} onPress={handleNumberPress} />

        {/* SUPPRIMER */}
        <button
          onClick={deleteDigit}
          className="
            h-16 rounded-xl text-lg text-gray-500 dark:text-gray-200 
            flex items-center justify-center active:scale-95 transition
          "
        >
          ⌫
        </button>
      </div>

      {/* CONFIRM BUTTON */}
      <button
        onClick={validateOtp}
        className="
          w-full py-3 rounded-xl
          bg-blue-600 hover:bg-blue-700 active:scale-95 
          text-white font-semibold shadow-lg transition
        "
      >
        Vérifier le code
      </button>

      {/* Renvoyer code */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          {timer > 0 ? (
            <>Renvoyer un code dans <span className="text-blue-500">{timer}s</span></>
          ) : (
            <button
              onClick={resendOtp}
              className="text-blue-500 font-semibold"
            >
              Renvoyer le code
            </button>
          )}
        </p>
      </div>

      {/* ANIMATION SHAKE */}
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

/* ======================================================
   BOUTON CLAVIER NUMÉRIQUE
====================================================== */

function KeyButton({ number, onPress }) {
  return (
    <button
      onClick={() => onPress(String(number))}
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
