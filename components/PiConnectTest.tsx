"use client";

import { useState } from "react";

export default function PiPaymentTest() {
  const [status, setStatus] = useState("");

  const createPayment = async () => {
    if (!window.Pi) return alert("Ouvre Pimpay dans le Pi Browser");

    setStatus("Initialisation...");

    try {
      const paymentData = {
        amount: 1.0, // Montant du test
        memo: "Test de dépôt sur Pimpay", // Note pour l'utilisateur
        metadata: { userId: "user_123" }, // Infos internes
      };

      const callbacks = {
        onReadyForServerApproval: async (paymentId: string) => {
          setStatus("Approbation en cours...");
          // On informe notre serveur que le paiement est prêt
          await fetch("/api/payments/approve", {
            method: "POST",
            body: JSON.stringify({ paymentId }),
          });
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          setStatus("Finalisation...");
          // On finalise la transaction sur notre serveur
          await fetch("/api/payments/complete", {
            method: "POST",
            body: JSON.stringify({ paymentId, txid }),
          });
          setStatus("Paiement réussi !");
        },
        onCancel: (paymentId: string) => setStatus("Paiement annulé"),
        onError: (error: Error, paymentId?: string) => {
          console.error("Erreur Pi:", error);
          setStatus("Erreur lors du paiement");
        },
      };

      // Déclenche l'interface Pi Network
      window.Pi.createPayment(paymentData, callbacks);
    } catch (err) {
      console.error(err);
      setStatus("Erreur fatale");
    }
  };

  return (
    <div className="p-4 bg-slate-900 rounded-2xl border border-emerald-500/30">
      <h3 className="text-white font-bold mb-2">Test de Dépôt Pi</h3>
      <p className="text-slate-400 text-xs mb-4">Statut : {status}</p>
      <button
        onClick={createPayment}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all"
      >
        Envoyer 1 Pi à Pimpay
      </button>
    </div>
  );
}
