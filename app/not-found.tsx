"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Home, LogIn, Lock } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Déterminer si l'utilisateur est connecté pour rediriger vers la bonne page
  useEffect(() => {
    const hasToken =
      document.cookie.includes("token=") ||
      document.cookie.includes("pi_session_token=");
    setIsLoggedIn(hasToken);
  }, []);

  const handleBack = () => {
    if (isLoggedIn) {
      router.push("/dashboard");
    } else {
      router.push("/auth/login");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#02040a]/95 backdrop-blur-xl p-4">
      {/* Background glow effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[200px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-[440px]"
        >
          {/* Glassmorphism card — même style que TransactionConfirmModal */}
          <div className="relative bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden">
            {/* Reflet spéculaire */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="px-6 pt-10 pb-8">
              {/* Icône */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="p-5 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20"
                >
                  <Lock className="text-red-400" size={36} />
                </motion.div>
              </div>

              {/* Titre */}
              <div className="text-center mb-2">
                <p className="text-[9px] font-black text-red-400 uppercase tracking-[0.3em] mb-2">
                  Erreur 404
                </p>
                <h1 className="text-2xl font-black uppercase tracking-tight text-white">
                  Accès Non Autorisé
                </h1>
              </div>

              {/* Message */}
              <p className="text-center text-sm text-slate-400 leading-relaxed mt-4 mb-8">
                La page que vous cherchez n&apos;existe pas ou vous n&apos;avez pas les permissions
                pour y accéder.
              </p>

              {/* Code d'erreur décoratif */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                <ShieldAlert size={18} className="text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    Code d&apos;erreur
                  </p>
                  <p className="text-xs font-mono text-slate-300 mt-0.5">
                    HTTP_404_NOT_FOUND
                  </p>
                </div>
              </div>

              {/* Bouton retour */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleBack}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {isLoggedIn ? (
                  <>
                    <Home size={16} />
                    Retour au Tableau de Bord
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Aller à la Connexion
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
