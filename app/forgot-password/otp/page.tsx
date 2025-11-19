"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OTPVerify() {
  const [email,setEmail]=useState("");
  const [otp,setOtp]=useState("");
  const router = useRouter();

  const verify = async () => {
    const res = await fetch("/api/auth/verify-otp", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ email, otp })
    });
    if (res.ok) router.push("/reset-password"); // you can redirect to reset-password page
    else {
      const j = await res.json();
      alert(j.error || "OTP invalide");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-soft dark:bg-darkBg">
      <div className="max-w-md w-full bg-white/60 dark:bg-white/10 p-8 rounded-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-2">Vérifier le code</h1>
        <p className="text-sm text-muted-foreground mb-4">Entrez le code reçu par email ou SMS</p>

        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-3 rounded-xl mb-3 bg-transparent border border-white/20" />
        <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Code OTP" className="w-full p-3 rounded-xl mb-4 bg-transparent border border-white/20" />

        <button onClick={verify} className="w-full py-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-white">Vérifier</button>
      </div>
    </div>
  );
}
