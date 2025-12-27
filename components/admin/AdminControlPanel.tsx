"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, Users, Settings, Zap, 
  Ban, CheckCircle, Wallet, CreditCard, 
  Hammer, TrendingUp, AlertTriangle, RefreshCw
} from "lucide-react";
import { toast } from "react-hot-toast";

interface AdminControlProps {
  userId?: string;
  userName?: string;
  userEmail?: string;
  currentRole?: string;
}

export const AdminControlPanel = ({ userId, userName, userEmail, currentRole }: AdminControlProps) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const runAction = async (action: string, extraData?: any) => {
    setLoadingAction(action);
    try {
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, ...extraData }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Erreur de connexion au noyau");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      {/* HEADER SECTION */}
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2.5rem] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500 rounded-2xl text-white">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Zone d'Administration</h2>
            <p className="text-xs text-red-400 font-bold uppercase tracking-widest">Contrôle du noyau PimPay</p>
          </div>
        </div>
        {userId && (
          <div className="text-right hidden md:block">
            <p className="text-sm font-black text-white">{userName || "Utilisateur"}</p>
            <p className="text-[10px] text-slate-500">{userEmail}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SECTION 1: GESTION UTILISATEUR */}
        {userId && (
          <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-blue-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Actions Utilisateur</h3>
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
                icon={<CheckCircle size={16}/>} 
                onClick={() => runAction("VERIFY_KYC")}
                loading={loadingAction === "VERIFY_KYC"}
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
          <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={18} className="text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Finance & Visa</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdminButton 
                label="+10 Pi (Airdrop)" 
                icon={<Zap size={16}/>} 
                onClick={() => runAction("UPDATE_BALANCE", { amount: 10 })}
                loading={loadingAction === "UPDATE_BALANCE"}
                variant="primary"
              />
              <AdminButton 
                label="Bloquer Carte" 
                icon={<CreditCard size={16}/>} 
                onClick={() => runAction("TOGGLE_CARD_LOCK")}
                loading={loadingAction === "TOGGLE_CARD_LOCK"}
              />
              <AdminButton 
                label="Reset PIN" 
                icon={<RefreshCw size={16}/>} 
                onClick={() => {
                   const pin = prompt("Nouveau PIN (4 chiffres) :");
                   if(pin) runAction("RESET_PIN", { extraData: pin });
                }}
              />
              <AdminButton 
                label="Approuver Retrait" 
                icon={<CheckCircle size={16}/>} 
                onClick={() => runAction("APPROVE_WITHDRAW")}
                variant="success"
              />
            </div>
          </div>
        )}

        {/* SECTION 3: SYSTÈME GLOBAL */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={18} className="text-purple-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Contrôle Global du Système</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AdminButton 
              label="Mode Maintenance" 
              icon={<Hammer size={16}/>} 
              onClick={() => runAction("TOGGLE_MAINTENANCE")}
              variant="danger"
            />
            <AdminButton 
              label="Prix GCV Pi" 
              icon={<TrendingUp size={16}/>} 
              onClick={() => {
                const price = prompt("Nouveau prix GCV ($) :");
                if(price) runAction("SET_CONSENSUS_PRICE", { amount: parseFloat(price) });
              }}
            />
            <AdminButton 
              label="Global Airdrop" 
              icon={<Zap size={16}/>} 
              onClick={() => {
                const amt = prompt("Montant à envoyer à TOUT LE MONDE :");
                if(amt) runAction("GLOBAL_AIRDROP", { amount: parseFloat(amt) });
              }}
              variant="primary"
            />
            <AdminButton 
                label="Récupérer Logs" 
                icon={<RefreshCw size={16}/>} 
                onClick={() => toast.success("Logs exportés")}
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
      className={`h-12 px-4 rounded-2xl border flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest ${variants[variant]}`}
    >
      {loading ? <RefreshCw className="animate-spin" size={16} /> : icon}
      <span className="truncate">{label}</span>
    </button>
  );
};
