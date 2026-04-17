"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authenticatePiUser } from "@/app/actions/pi-auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function PiLoginButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePiLogin = async () => {
    if (!window.Pi) {
      toast.error("Veuillez ouvrir PimPay depuis le Pi Browser");
      return;
    }

    setLoading(true);
    try {
      const scopes = ['username', 'payments'];
      
      // Demande d'authentification au SDK Pi
      const auth = await window.Pi.authenticate(scopes, (payment: any) => {
        console.log("Paiement incomplet:", payment);
      });

      // Enregistrement dans Prisma via notre Server Action
      const result = await authenticatePiUser({
        uid: auth.user.uid,
        username: auth.user.username
      });

      if (result.success) {
        toast.success(`Bienvenue sur PimPay, ${auth.user.username} !`);
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("Échec de la connexion Pi Network");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePiLogin}
      disabled={loading}
      className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl font-black uppercase italic shadow-lg shadow-blue-500/20"
    >
      {loading ? "Synchronisation..." : "Se connecter avec Pi Network"}
    </Button>
  );
}
