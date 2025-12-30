"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

declare global {
  interface Window {
    Pi: any;
  }
}

export function PiMainnetIntegration() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Initialisation du SDK
    if (window.Pi) {
      window.Pi.init({ version: "2.0", sandbox: false }); // sandbox: false pour le Mainnet
    }
  }, []);

  const handleLogin = async () => {
    try {
      const scopes = ['payments', 'username'];
      const auth = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
      setUser(auth.user);
      toast.success(`Connecté en tant que ${auth.user.username}`);
    } catch (error) {
      console.error("Erreur d'authentification Pi:", error);
    }
  };

  // Gestion des paiements interrompus (obligatoire pour le Mainnet)
  const onIncompletePaymentFound = (payment: any) => {
    console.log("Paiement incomplet trouvé:", payment);
    // Ici, tu devrais envoyer le 'payment.identifier' à ton backend pour vérification
  };

  const createPayment = async () => {
    try {
      const paymentData = {
        amount: 3.14,
        memo: "Achat sur PimPay",
        metadata: { productId: "item_123" }
      };

      const callbacks = {
        onReadyForServerApproval: (paymentId: string) => {
          // Étape 1 : Envoyer le paymentId à ton API Route Prisma pour approbation
          fetch("/api/pi/approve", {
            method: "POST",
            body: JSON.stringify({ paymentId })
          });
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          // Étape 2 : Finaliser la transaction dans ta DB
          fetch("/api/pi/complete", {
            method: "POST",
            body: JSON.stringify({ paymentId, txid })
          });
        },
        onCancel: (paymentId: string) => console.log("Annulé", paymentId),
        onError: (error: Error, payment?: any) => console.error("Erreur", error)
      };

      await window.Pi.createPayment(paymentData, callbacks);
    } catch (error) {
      toast.error("Erreur lors de la création du paiement");
    }
  };

  return (
    <div className="p-6 bg-slate-900/50 border border-white/5 rounded-[2rem] space-y-4">
      <h2 className="text-xl font-black text-white italic">PIMPAY <span className="text-blue-500">BLOCKCHAIN</span></h2>
      
      {!user ? (
        <Button onClick={handleLogin} className="w-full bg-blue-600 rounded-2xl font-bold">
          SE CONNECTER AU PI NETWORK
        </Button>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-mono">Utilisateur: {user.username}</p>
          <Button onClick={createPayment} className="w-full bg-emerald-600 rounded-2xl font-bold">
            PAYER 3.14 π
          </Button>
        </div>
      )}
    </div>
  );
}
