"use client";

import React, { useState } from "react";
import {
  ShieldAlert, Users, Settings, Zap,
  Ban, CheckCircle, Wallet, CreditCard,
  Hammer, TrendingUp, AlertTriangle, RefreshCw,
  UserCheck
} from "lucide-react";
import { toast } from "sonner"; // Changé react-hot-toast par sonner pour cohérence avec ton projet

interface AdminControlProps {
  userId?: string;
  userName?: string;
  userEmail?: string;
  currentRole?: string;
}

export const AdminControlPanel = ({ userId, userName, userEmail, currentRole }: AdminControlProps) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const runAction = async (action: string, payload: any = {}) => {
    setLoadingAction(action);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId, 
          action, 
          ...payload 
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || "Action effectuée avec succès");
      } else {
        toast.error(data.error || "L'action a échoué");
      }
    } catch (err) {
      toast.error("Erreur de connexion au noyau PimPay");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      {/* HEADER SECTION */}
      <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2.5rem] flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight italic">PIMPAY<span className="text-blue-500">CORE</span></h2>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[3px]">Security & Control Unit</p>
          </div>
        </div>
        {userId && (
          <div className="text-right hidden md:block">
            <p className="text-sm font-black text-white uppercase">{userName || "Utilisateur"}</p>
            <p className="text-[9px] text-blue-500 font-mono font-bold tracking-widest">{userId.substring(0, 12)}...</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* SECTION 1: GESTION UTILISATEUR */}
        {userId && (
          <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem] space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-blue-500" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Privilèges & Accès</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdminButton
                label="Bannir / Débannir"
                icon={<Ban size={16}/>}
                onClick={() => runAction("BAN")}
                loading={loadingAction === "BAN"}
                variant="danger"
              />
              <AdminButton
                label="Vérifier KYC"
                icon={<UserCheck size={16}/>}
                onClick={() => runAction("APPROVE_KYC")}
                loading={loadingAction === "APPROVE_KYC"}
                variant="success"
              />
              <AdminButton
                label="Geler Compte"
                icon={<AlertTriangle size={16}/>}
                onClick={() => runAction("FREEZE")}
                loading={loadingAction === "FREEZE"}
                variant="warning"
              />
              <AdminButton
                label="Changer Rôle"
                icon={<RefreshCw size={16}/>}
                onClick={() => runAction("TOGGLE_ROLE")}
                loading={loadingAction === "TOGGLE_ROLE"}
              />
            </div>
          </div>
        )}

        {/* SECTION 2: FINANCE & CARTE */}
        {userId && (
          <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem] space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={18} className="text-emerald-500" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Solde & Assets</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdminButton
                label="+10 Pi (Airdrop)"
                icon={<Zap size={16}/>}
                onClick={() => runAction("AIRDROP", { amount: 10 })}
                loading={loadingAction === "AIRDROP"}
                variant="primary"
              />
              <AdminButton
                label="Reset Solde"
                icon={<RefreshCw size={16}/>}
                onClick={() => {
                  const amt = prompt("Définir le solde exact :");
                  if(amt) runAction("UPDATE_BALANCE", { amount: parseFloat(amt) });
                }}
              />
              <AdminButton
                label="Reset PIN"
                icon={<CreditCard size={16}/>}
                onClick={() => {
                   const pin = prompt("Nouveau PIN (4 ou 6 chiffres) :");
                   if(pin) runAction("RESET_PIN", { newSecret: pin });
                }}
                loading={loadingAction === "RESET_PIN"}
              />
              <AdminButton
                label="Maintenance Indiv."
                icon={<Hammer size={16}/>}
                onClick={() => {
                  const d = prompt("Date fin (YYYY-MM-DD) :");
                  const t = prompt("Heure (HH:MM) :");
                  if (d && t) {
                    runAction("USER_SPECIFIC_MAINTENANCE", { extraData: `${d}T${t}:00.000Z` });
                  } else if (d) {
                    runAction("USER_SPECIFIC_MAINTENANCE", { extraData: `${d}T23:59:00.000Z` });
                  } else {
                    runAction("USER_SPECIFIC_MAINTENANCE");
                  }
                }}
                variant="warning"
                loading={loadingAction === "USER_SPECIFIC_MAINTENANCE"}
              />
            </div>
          </div>
        )}

        {/* SECTION 3: SYSTÈME GLOBAL */}
        <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem] space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={18} className="text-purple-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contrôle Global du Réseau</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AdminButton
              label="Maintenance"
              icon={<Hammer size={16}/>}
              onClick={() => runAction("TOGGLE_MAINTENANCE")}
              variant="danger"
              loading={loadingAction === "TOGGLE_MAINTENANCE"}
            />
            <AdminButton
              label="Prix GCV"
              icon={<TrendingUp size={16}/>}
              onClick={() => {
                const price = prompt("Nouveau prix Consensus ($) :");
                if(price) runAction("UPDATE_CONFIG", { amount: parseFloat(price) }); // Assure-toi d'avoir UPDATE_CONFIG dans l'API
              }}
            />
            <AdminButton
              label="Airdrop Global"
              icon={<Zap size={16}/>}
              onClick={() => {
                const amt = prompt("Montant pour TOUS les utilisateurs :");
                if(amt) runAction("AIRDROP_ALL", { amount: parseFloat(amt) });
              }}
              variant="primary"
              loading={loadingAction === "AIRDROP_ALL"}
            />
            <AdminButton
                label="Annonce"
                icon={<RefreshCw size={16}/>}
                onClick={() => {
                  const msg = prompt("Message de l'annonce :");
                  if(msg) runAction("SEND_NETWORK_ANNOUNCEMENT", { extraData: msg });
                }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/* SOUS-COMPOSANT BOUTON */
const AdminButton = ({ label, icon, onClick, loading, variant = "default" }: any) => {
  const variants: any = {
    default: "bg-white/5 hover:bg-white/10 border-white/5 text-white",
    primary: "bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/20 text-blue-400",
    success: "bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/20 text-emerald-400",
    warning: "bg-orange-600/20 hover:bg-orange-600/30 border-orange-500/20 text-orange-400",
    danger: "bg-red-600/20 hover:bg-red-600/30 border-red-500/20 text-red-400",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`h-12 px-4 rounded-2xl border flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 text-[9px] font-black uppercase tracking-tighter ${variants[variant]}`}
    >
      {loading ? <RefreshCw className="animate-spin" size={14} /> : icon}
      <span className="truncate">{label}</span>
    </button>
  );
};
