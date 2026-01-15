"use client";

import { useEffect, useState, useCallback } from "react";

// Définition du type pour le Pi Browser SDK
declare global {
  interface Window {
    Pi: any;
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Récupération des données du Dashboard Pimpay
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard'); 
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Erreur de rafraîchissement Pimpay:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initialisation au chargement
    fetchDashboardData();

    // Rafraîchissement automatique (optionnel, toutes le 10s pour économiser les ressources)
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // 2. Fonction de Paiement (Déclenchée par le bouton)
  const handleReceivePi = async () => {
    if (typeof window === "undefined" || !window.Pi) {
      alert("Veuillez ouvrir cette application dans le Pi Browser.");
      return;
    }

    setIsPaying(true);

    try {
      // Configuration du paiement pour le SDK Pi
      const paymentData = {
        amount: 1.0,
        memo: "Dépôt sur mon compte Pimpay",
        metadata: { 
          userId: data?.user?.id,
          type: "deposit_pi" 
        }
      };

      const callbacks = {
        onReadyForServerApproval: async (paymentId: string) => {
          console.log("Approbation du paiement côté serveur...");
          // Appelle ta route /api/pi/approve que nous avons corrigée
          await fetch('/api/pi/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, amount: 1.0 })
          });
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log("Finalisation du paiement...");
          // Appelle ta route /api/pi/complete que nous avons corrigée
          await fetch('/api/pi/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, txid })
          });
          
          // Succès ! On rafraîchit les données du solde
          fetchDashboardData();
          setIsPaying(false);
          alert("Dépôt réussi ! Votre solde a été mis à jour.");
        },
        onCancel: (paymentId: string) => {
          console.log("Paiement annulé.");
          setIsPaying(false);
        },
        onError: (error: Error, payment?: any) => {
          console.error("Erreur SDK Pi:", error);
          setIsPaying(false);
          alert("Erreur lors du paiement Pi.");
        },
      };

      // Déclenchement effectif de la fenêtre Pi
      await window.Pi.createPayment(paymentData, callbacks);

    } catch (err) {
      console.error("Erreur lors de la création du paiement:", err);
      setIsPaying(false);
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto bg-slate-900 text-white rounded-xl shadow-2xl mt-10 border border-slate-800">
      <h1 className="text-2xl font-black text-purple-400 mb-6 uppercase tracking-tighter">
        Pimpay Dashboard
      </h1>

      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400">Synchronisation Elara...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Utilisateur connecté</p>
            <p className="text-xl font-bold">@{data?.user?.username || "Pionnier"}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-slate-800 p-6 rounded-xl border border-purple-500/30">
            <p className="text-purple-300 text-sm mb-1 uppercase tracking-widest font-bold">Solde Actuel</p>
            <p className="text-4xl font-black">{data?.wallet?.balance || 0} <span className="text-lg text-purple-400">π</span></p>
          </div>

          <button
            onClick={handleReceivePi}
            disabled={isPaying}
            className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 disabled:bg-slate-700 disabled:text-slate-500"
          >
            {isPaying ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Transaction sécurisée...
              </span>
            ) : (
              "DÉPOSER 1 PI SUR PIMPAY"
            )}
          </button>
          
          <p className="text-[10px] text-center text-slate-500 italic">
            Protocole sécurisé par Elara • Pi Network Mainnet
          </p>
        </div>
      )}
    </div>
  );
}
