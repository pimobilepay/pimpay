"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const router = useRouter();

  const submit = async () => {
    const res = await fetch("/api/auth/register", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ email, password, name })
    });
    if (res.ok) router.push("/");
    else {
      const j = await res.json();
      alert(j.error || "Erreur");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-soft dark:bg-darkBg">
      <div className="max-w-md w-full bg-white/60 dark:bg-white/10 p-8 rounded-2xl backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-foreground mb-2">Inscription</h1>
        <p className="text-sm text-muted-foreground mb-4">Créez votre compte PIMPAY</p>

        <label className="text-sm text-muted-foreground">Nom</label>
        <input className="w-full p-3 rounded-xl mb-3 bg-transparent border border-white/20" value={name} onChange={e=>setName(e.target.value)} />

        <label className="text-sm text-muted-foreground">Email</label>
        <input className="w-full p-3 rounded-xl mb-3 bg-transparent border border-white/20" value={email} onChange={e=>setEmail(e.target.value)} />

        <label className="text-sm text-muted-foreground">Mot de passe</label>
        <input type="password" className="w-full p-3 rounded-xl mb-4 bg-transparent border border-white/20" value={password} onChange={e=>setPassword(e.target.value)} />

        <button onClick={submit} className="w-full py-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-white font-semibold">S'inscrire</button>
      </div>
    </div>
  );
}
