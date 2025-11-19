"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Smartphone,
  Fingerprint,
  KeyRound,
  Mail,
  MessageCircle,
  ChevronRight,
} from "lucide-react";

export default function SecurityPage() {
  // STATES
  const [otpEmail, setOtpEmail] = useState(false);
  const [otpSms, setOtpSms] = useState(false);
  const [biometric, setBiometric] = useState(false);

  // Charger les valeurs sauvegardées
  useEffect(() => {
    setOtpEmail(localStorage.getItem("otpEmail") === "true");
    setOtpSms(localStorage.getItem("otpSms") === "true");
    setBiometric(localStorage.getItem("biometric") === "true");
  }, []);

  // Switch générique
  const toggleSwitch = (key, value, setValue) => {
    const newVal = !value;
    setValue(newVal);
    localStorage.setItem(key, newVal.toString());
  };

  return (
    <div className="p-4 space-y-6 pb-20">

      {/* HEADER */}
      <h1 className="text-2xl font-bold text-foreground">Sécurité</h1>
      <p className="text-muted-foreground text-sm">
        Gérez la sécurité de votre compte PIMPAY
      </p>

      {/* SECTION OTP */}
      <SecurityCard title="Authentification OTP">

        <SecurityToggle
          icon={<Mail />}
          label="OTP par email"
          value={otpEmail}
          onToggle={() => toggleSwitch("otpEmail", otpEmail, setOtpEmail)}
        />

        <SecurityToggle
          icon={<MessageCircle />}
          label="OTP par SMS"
          value={otpSms}
          onToggle={() => toggleSwitch("otpSms", otpSms, setOtpSms)}
        />

      </SecurityCard>

      {/* SECTION CODE PIN */}
      <SecurityCard title="Code PIN">
        <SecurityAction
          icon={<KeyRound />}
          label="Modifier le code PIN"
          path="/security/pin"
        />
      </SecurityCard>

      {/* SECTION BIOMETRIE */}
      <SecurityCard title="Biométrie">
        <SecurityToggle
          icon={<Fingerprint />}
          label="Activer l’authentification biométrique"
          value={biometric}
          onToggle={() => toggleSwitch("biometric", biometric, setBiometric)}
        />
      </SecurityCard>

    </div>
  );
}

/* ============================================================
   COMPONENT: CARD
============================================================ */

function SecurityCard({ title, children }) {
  return (
    <div
      className="
        bg-white/5 border border-white/10 
        dark:bg-white/5 dark:border-white/10
        backdrop-blur-xl
        p-5 rounded-xl shadow-lg
      "
    >
      <h2 className="text-lg font-semibold mb-3 text-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/* ============================================================
   COMPONENT: SWITCH OPTION
============================================================ */

function SecurityToggle({ icon, label, value, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="
        w-full flex items-center justify-between 
        p-4 rounded-lg
        bg-white/5 hover:bg-white/10
        transition
      "
    >
      <div className="flex items-center gap-4">
        <span className="text-primary">{icon}</span>

        <span className="text-[15px] text-foreground font-medium">
          {label}
        </span>
      </div>

      {/* SWITCH */}
      <div
        className={`
          w-12 h-6 rounded-full p-1 flex items-center transition-all
          ${value ? "bg-blue-500" : "bg-gray-500/40"}
        `}
      >
        <div
          className={`
            w-5 h-5 rounded-full bg-white shadow transition-all
            ${value ? "translate-x-6" : ""}
          `}
        ></div>
      </div>
    </button>
  );
}

/* ============================================================
   COMPONENT: ACTION BUTTON
============================================================ */

import { useRouter } from "next/navigation";

function SecurityAction({ icon, label, path }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(path)}
      className="
        w-full flex items-center justify-between 
        p-4 rounded-lg
        bg-white/5 hover:bg-white/10
        transition
      "
    >
      <div className="flex items-center gap-4">
        <span className="text-primary">{icon}</span>

        <span className="text-[15px] text-foreground font-medium">
          {label}
        </span>
      </div>

      <ChevronRight className="text-muted-foreground" />
    </button>
  );
}
