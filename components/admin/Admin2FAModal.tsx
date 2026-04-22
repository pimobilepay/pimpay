"use client";

import React, { useState, useRef, useEffect } from "react";
import { ShieldCheck, X, Loader2, AlertTriangle } from "lucide-react";

interface Admin2FAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  actionTitle: string;
  actionDescription?: string;
  variant?: "danger" | "warning" | "default";
}

export const Admin2FAModal = ({
  isOpen,
  onClose,
  onVerified,
  actionTitle,
  actionDescription,
  variant = "default",
}: Admin2FAModalProps) => {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCode(["", "", "", "", "", ""]);
      setError(null);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value) {
      const fullCode = newCode.join("");
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      const fullCode = code.join("");
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setCode(newCode);
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (fullCode: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onVerified();
        onClose();
      } else {
        setError(data.error || "Code invalide");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      border: "border-red-500/30",
      bg: "bg-red-500/10",
      icon: "text-red-500",
      button: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      border: "border-orange-500/30",
      bg: "bg-orange-500/10",
      icon: "text-orange-500",
      button: "bg-orange-600 hover:bg-orange-700",
    },
    default: {
      border: "border-blue-500/30",
      bg: "bg-blue-500/10",
      icon: "text-blue-500",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md bg-slate-900 border ${styles.border} rounded-3xl p-6 shadow-2xl`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className={`inline-flex p-4 rounded-2xl ${styles.bg} mb-4`}>
            {variant === "danger" ? (
              <AlertTriangle size={32} className={styles.icon} />
            ) : (
              <ShieldCheck size={32} className={styles.icon} />
            )}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Verification 2FA Requise</h3>
          <p className="text-sm text-slate-400">
            Entrez le code de Google Authenticator pour confirmer:
          </p>
          <p className={`text-sm font-bold mt-2 ${styles.icon}`}>
            {actionTitle}
          </p>
          {actionDescription && (
            <p className="text-xs text-slate-500 mt-1">{actionDescription}</p>
          )}
        </div>

        {/* OTP Input */}
        <div className="flex justify-center gap-2 mb-6">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={loading}
              className={`w-12 h-14 text-center text-2xl font-bold bg-slate-800 border-2 ${
                error ? "border-red-500" : "border-slate-700 focus:border-blue-500"
              } rounded-xl text-white outline-none transition-all disabled:opacity-50`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => handleVerify(code.join(""))}
            disabled={loading || code.join("").length !== 6}
            className={`flex-1 h-12 ${styles.button} text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Verification...
              </>
            ) : (
              "Confirmer"
            )}
          </button>
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-slate-500 mt-4">
          Ouvrez Google Authenticator et entrez le code a 6 chiffres
        </p>
      </div>
    </div>
  );
};
