"use client";

import { getErrorMessage } from '@/lib/error-utils';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CardDeleteButtonProps {
  cardId: string;
  cardLast4: string;
}

export function CardDeleteButton({ cardId, cardLast4 }: CardDeleteButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/card/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      toast.success("Carte supprimee avec succes");
      setShowConfirm(false);
      
      // Remove from localStorage if it was the selected card
      const selectedCard = localStorage.getItem("pimpay_selected_card");
      if (selectedCard === cardId) {
        localStorage.removeItem("pimpay_selected_card");
        window.dispatchEvent(new Event("pimpay_card_changed"));
      }
      
      // Refresh the page to show updated list
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? getErrorMessage(error) : "Erreur lors de la suppression";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 backdrop-blur-md rounded-xl text-red-400 text-xs font-bold uppercase tracking-wider transition-all"
      >
        <Trash2 size={14} />
        <span>Supprimer</span>
      </button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !isDeleting && setShowConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#0f0a1f] border border-white/10 rounded-3xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
                      <AlertTriangle size={24} className="text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white uppercase tracking-tight">
                        Supprimer la carte
                      </h2>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                        Action irreversible
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !isDeleting && setShowConfirm(false)}
                    disabled={isDeleting}
                    className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                  <p className="text-sm text-white/80 leading-relaxed">
                    {"Etes-vous sur de vouloir supprimer la carte se terminant par "}
                    <span className="font-mono font-bold text-red-400">{cardLast4}</span>
                    {" ? Cette action est irreversible."}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-3.5 bg-red-500 border border-red-400 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Suppression...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Confirmer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
