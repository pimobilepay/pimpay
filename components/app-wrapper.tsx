"use client";

import type { ReactNode } from "react";
import { PiAuthProvider, usePiAuth } from "@/context/pi-auth-context";
// Import par défaut corrigé (sans accolades)
import AuthLoadingScreen from "./auth-loading-screen";

function AppContent({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = usePiAuth();

  // On affiche l'écran de chargement si le SDK initialise 
  // ou si l'utilisateur n'est pas encore connecté
  if (isLoading || !isAuthenticated) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}

export function AppWrapper({ children }: { children: ReactNode }) {
  return (
    <PiAuthProvider>
      <AppContent>{children}</AppContent>
    </PiAuthProvider>
  );
}
