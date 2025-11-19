"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePinPage() {
  const [pin, setPin] = useState("");
  const router = useRouter();

  const submit = async () => {
    // Send request with Authorization Bearer token (user must be logged in)
    const res = await fetch("/api/auth/set-pin", {
      method: "POST",
      headers: {
        "Content-Type":"application/json",
        Authorization: `Bearer ${localStorage.getItem("pimpay_token") || ""}`
      },
      body: JSON.stringify({ pin }),
    });

    if (res.ok) {
      alert("PIN mis à jour");
      router.push("/settings");
    } else {
      alert("Erreur");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-soft dark:bg-darkBg">
      <div className="max-w-md w-full bg-white/60 dark:bg-white/10 p-8 rounded-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-2">Créer un PIN (4 chiffres)</h1>
        <p className="text-sm text-muted-foreground mb-4">Utilisé pour déverrouiller l'app</p>

        <input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4}
               className="w-full p-3 text-center text-xl rounded-xl mb-4 bg-transparent border border-white/20" />

        <button onClick={submit} disabled={pin.length!==4} className={`w-full py-3 rounded-xl ${pin.length===4 ? "bg-gradient-to-br from-blue-600 to-blue-400 text-white" : "bg-gray-400/30 text-gray-600"}`}>Enregistrer PIN</button>
      </div>
    </div>
  );
}

