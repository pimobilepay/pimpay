"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CardSelectButtonProps {
  cardId: string;
}

export function CardSelectButton({ cardId }: CardSelectButtonProps) {
  const [isSelected, setIsSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if this card is the currently selected primary card
    const selectedCardId = localStorage.getItem("pimpay_primary_card");
    setIsSelected(selectedCardId === cardId);
  }, [cardId]);

  const handleSelect = async () => {
    setIsLoading(true);
    try {
      // Store the selected card ID in localStorage
      localStorage.setItem("pimpay_primary_card", cardId);
      setIsSelected(true);
      toast.success("Carte selectionnee comme carte principale");
      
      // Dispatch custom event to notify same-tab listeners
      window.dispatchEvent(new Event("pimpay_card_changed"));
      
      // Also notify the server to update the default card
      await fetch("/api/cards/set-primary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      
      router.refresh();
    } catch {
      toast.error("Erreur lors de la selection");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSelect}
      disabled={isLoading || isSelected}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 border backdrop-blur-md rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
        isSelected
          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 cursor-default"
          : "bg-white/5 hover:bg-cyan-500/10 border-white/10 hover:border-cyan-500/30 text-white"
      }`}
    >
      {isSelected ? (
        <>
          <CheckCircle2 size={14} />
          <span>Principale</span>
        </>
      ) : (
        <>
          <CreditCard size={14} />
          <span>{isLoading ? "..." : "Utiliser"}</span>
        </>
      )}
    </button>
  );
}
