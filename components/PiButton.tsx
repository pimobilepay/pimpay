"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PiButtonProps {
  amountUsd: string;
  piAmount: string;
  onSuccess?: () => void;
}

export function PiButton({ amountUsd, piAmount, onSuccess }: PiButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    // 1. Vérifier si on est dans le Pi Browser
    if (!(window as any).Pi) {
      toast.error("Veuillez ouvrir PimPay dans le Pi Browser.");
      return;
    }

    const Pi = (window as any).Pi;

    if (!piAmount || parseFloat(piAmount) <= 0) {
      toast.error("Veuillez entrer un montant valide.");
      return;
    }

    setLoading(true);

    try {
      // 2. AUTHENTIFICATION OBLIGATOIRE
      // On demande l'autorisation avant de créer le paiement
      const auth = await Pi.authenticate(['payments', 'username'], (payment: any) => {
        // Callback optionnel pour les paiements incomplets
        console.log("Paiement incomplet détecté", payment);
      });

      console.log("Auth réussie pour :", auth.user.username);

      // 3. CRÉATION DU PAIEMENT
      await Pi.createPayment({
        amount: parseFloat(piAmount),
        memo: `Dépôt PimPay - ${amountUsd} USD`,
        metadata: { type: "wallet_deposit", usd_val: amountUsd },
      }, {
        onReadyForServerApproval: async (paymentId: string) => {
          console.log("Approbation serveur pour:", paymentId);
          const res = await fetch("/api/pi/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, amount: piAmount }),
          });
          if (!res.ok) throw new Error("Approbation échouée");
          return res.json();
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log("Complétion transaction:", txid);
          const res = await fetch("/api/pi/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });
          if (res.ok) {
            toast.success("Transaction réussie sur la Blockchain !");
            if (onSuccess) onSuccess();
          }
          return res.json();
        },
        onCancel: (paymentId: string) => {
          setLoading(false);
          toast.info("Paiement annulé.");
        },
        onError: (error: Error, payment?: any) => {
          setLoading(false);
          console.error("Erreur SDK Pi:", error);
          toast.error("Le protocole Pi a rejeté la transaction.");
        },
      });
    } catch (error) {
      setLoading(false);
      console.error("Erreur globale:", error);
      toast.error("Erreur d'initialisation du paiement.");
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading || !piAmount || parseFloat(piAmount) <= 0}
      className="w-full h-16 bg-gradient-to-r from-[#5c2d91] to-[#ffa500] hover:opacity-90 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
    >
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <>
          <span className="text-xl font-bold italic">π</span>
          <span>Payer {piAmount} PI</span>
        </>
      )}
    </button>
  );
}
