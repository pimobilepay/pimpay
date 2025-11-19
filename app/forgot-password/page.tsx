"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const [email,setEmail]=useState("");
  const router = useRouter();

  const submit = async () => {
    const res = await fetch("/api/auth/forgot", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ email })
    });
    if (res.ok) router.push("/forgot-password/otp");
    else alert("Erreur");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-soft dark:bg-darkBg">
      <div className="max-w-md w-full bg-white/60 dark:bg-white/10 p-8 rounded-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-2">Mot de passe oublié</h1>
        <p className="text-sm text-muted-foreground mb-4">Entrez votre email pour recevoir un code OTP</p>

        <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-3 rounded-xl mb-4 bg-transparent border border-white/20" />
        <button onClick={submit} className="w-full py-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-white">Envoyer le code</button>
      </div>
    </div>
  );
}
