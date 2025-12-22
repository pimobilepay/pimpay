"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function TestPiPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    if (!window.Pi) {
      toast.error("Ouvrez cette page dans le Pi Browser !");
      return;
    }

    setLoading(true);
    try {
      const scopes = ["username", "payments"];
      const auth = await window.Pi.authenticate(scopes, (payment: any) => {
        console.log("Paiement incomplet:", payment);
      });
      
      setUser(auth.user);
      toast.success(`Connecté : ${auth.user.username}`);
      console.log("Détails Auth:", auth);
    } catch (err) {
      console.error(err);
      toast.error("Échec de l'authentification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#020617]">
      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-400">Pimpay Test Center</h1>
        
        {!user ? (
          <button
            onClick={testAuth}
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Chargement SDK..." : "Tester Connexion Pi"}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-slate-400 text-sm">Utilisateur :</p>
              <p className="text-xl font-bold text-white">{user.username}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.uid}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-800 rounded-xl text-sm"
            >
              Recharger le test
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-[10px] text-center text-slate-500 uppercase tracking-widest">
            Mode Sandbox : <span className="text-green-500 font-bold">Actif</span>
          </p>
        </div>
      </div>
    </div>
  );
}
