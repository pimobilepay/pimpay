"use client";

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Coins } from 'lucide-react';

interface PiButtonProps {
  amount: string;
  memo: string;
  onSuccess?: () => void;
}

export const PiButton = ({ amount, memo, onSuccess }: PiButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    if (!window.Pi) {
      toast.error("Ouvrez PimPay dans le Pi Browser");
      return;
    }

    setLoading(true);

    try {
      // 1. Authentification de sécurité
      await window.Pi.authenticate(['payments', 'wallet_address', 'username'], (incomplete) => {
        console.log("Paiement incomplet trouvé", incomplete);
      });

      // 2. Création du paiement via le SDK
      await window.Pi.createPayment({
        amount: parseFloat(amount),
        memo: memo || "Transaction PimPay",
        metadata: { type: "user_payment" },
      }, {
        onReadyForServerApproval: async (paymentId) => {
          // Appel à ton API vaccinée
          const res = await fetch("/api/payments/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, amount: parseFloat(amount) }),
          });
          return res.json();
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          // Finalisation en base de données
          const res = await fetch("/api/payments/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });
          
          if (res.ok) {
            toast.success("Paiement réussi !");
            if (onSuccess) onSuccess();
          }
          setLoading(false);
          return res.json();
        },
        onCancel: () => setLoading(false),
        onError: (error) => {
          console.error("Erreur SDK:", error);
          toast.error("Erreur de paiement Pi");
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("Erreur globale:", error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full h-14 bg-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
    >
      {loading ? <Loader2 className="animate-spin" /> : <><Coins size={18}/> Payer avec Pi</>}
    </button>
  );
};
