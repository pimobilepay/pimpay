"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // 1. Vérifier si un token d'authentification existe
    // On suppose que ton token s'appelle 'auth_token' ou 'token'
    const token = localStorage.getItem("token"); 

    if (!token) {
      // 2. Si pas de token, redirection vers la page de connexion
      router.replace("/auth/login"); 
    } else {
      // 3. Si le token existe, redirection vers le dashboard
      router.replace("/dashboard");
    }
  }, [router]);

  // On affiche un fond noir ou un loader léger pendant la redirection
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
