"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert, Users, Settings, Zap,
  Ban, Wallet, CreditCard,
  Hammer, TrendingUp, AlertTriangle, RefreshCw,
  UserCheck, Trash2, LogOut
} from "lucide-react";
import { toast } from "sonner";
import { Admin2FAModal } from "./Admin2FAModal";

interface AdminControlProps {
  userId?: string;
  userName?: string;
  userEmail?: string;
  currentRole?: string;
}

export const AdminControlPanel = ({ userId, userName, userEmail, currentRole }: AdminControlProps) => {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  
  // 2FA Modal state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [pending2FAAction, setPending2FAAction] = useState<{
    type: "DELETE" | "AIRDROP" | "AIRDROP_ALL";
    amount?: number;
  } | null>(null);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  const runAction = async (action: string, payload: any = {}) => {
    setLoadingAction(action);
    try {
      // Use /api/admin/users/action for user-specific actions
      const res = await fetch("/api/admin/users/action", {
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
        toast.success(data.message || "Action effectuee avec succes");
        
        // Redirect to users list after deletion
        if (action === "DELETE_USER") {
          router.push("/admin/users");
        }
      } else {
        toast.error(data.error || "L'action a echoue");
      }
    } catch (err) {
      toast.error("Erreur de connexion au noyau PimPay");
    } finally {
      setLoadingAction(null);
    }
  };
  
  const handleDeleteUser = () => {
    if (!userId) return;
    const confirmed = confirm(`Supprimer definitivement l'utilisateur ${userName || userId} ?\n\nCette action est IRREVERSIBLE et supprimera:\n- Le compte utilisateur\n- Tous ses portefeuilles\n- Tout son historique de transactions`);
    if (confirmed) {
      const doubleConfirm = confirm("DERNIERE CONFIRMATION: Etes-vous vraiment sur de vouloir supprimer cet utilisateur ?");
      if (doubleConfirm) {
        // Require 2FA verification
        setPending2FAAction({ type: "DELETE" });
        setShow2FAModal(true);
      }
    }
  };

  const handleDisconnectUser = async () => {
    if (!userId) return;
    const confirmed = confirm(`Deconnecter ${userName || "cet utilisateur"} ?\n\nCette action va fermer toutes ses sessions actives et l'obliger a se reconnecter.`);
    if (!confirmed) return;

    setDisconnectLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/sessions`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(`${userName || "Utilisateur"} deconnecte - ${data.count} session(s) fermee(s)`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la deconnexion");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setDisconnectLoading(false);
    }
  };

  const handleAirdropWith2FA = (amount: number) => {
    setPending2FAAction({ type: "AIRDROP", amount });
    setShow2FAModal(true);
  };

  const handleAirdropAllWith2FA = (amount: number) => {
    setPending2FAAction({ type: "AIRDROP_ALL", amount });
    setShow2FAModal(true);
  };

  const on2FAVerified = () => {
    if (!pending2FAAction) return;
    
    switch (pending2FAAction.type) {
      case "DELETE":
        runAction("DELETE_USER");
        break;
      case "AIRDROP":
        if (pending2FAAction.amount) {
          runAction("AIRDROP", { amount: pending2FAAction.amount });
        }
        break;
      case "AIRDROP_ALL":
        if (pending2FAAction.amount) {
          runAction("AIRDROP_ALL", { amount: pending2FAAction.amount });
        }
        break;
    }
    
    setPending2FAAction(null);
  };

  return (
    <>
    {/* 2FA Verification Modal */}
    <Admin2FAModal
      isOpen={show2FAModal}
      onClose={() => {
        setShow2FAModal(false);
        setPending2FAAction(null);
      }}
      onVerified={on2FAVerified}
      actionTitle={
        pending2FAAction?.type === "DELETE" 
          ? `Supprimer ${userName || "l'utilisateur"}`
          : pending2FAAction?.type === "AIRDROP"
          ? `Airdrop de ${pending2FAAction.amount} Pi`
          : pending2FAAction?.type === "AIRDROP_ALL"
          ? `Airdrop Global de ${pending2FAAction.amount} Pi`
          : "Action sensible"
      }
      actionDescription={
        pending2FAAction?.type === "DELETE"
          ? "Cette action supprimera definitivement le compte et toutes ses donnees."
          : pending2FAAction?.type === "AIRDROP_ALL"
          ? "Cette action creditera TOUS les utilisateurs du montant specifie."
          : undefined
      }
      variant={pending2FAAction?.type === "DELETE" ? "danger" : "warning"}
    />
    
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
              <AdminButton
                label="Deconnecter"
                icon={<LogOut size={16}/>}
                onClick={handleDisconnectUser}
                loading={disconnectLoading}
                variant="danger"
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
                onClick={() => handleAirdropWith2FA(10)}
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
                   if(pin) runAction("RESET_PIN", { extraData: pin });
                }}
                loading={loadingAction === "RESET_PIN"}
              />
              <AdminButton
                label="Maintenance Indiv."
                icon={<Hammer size={16}/>}
                onClick={() => runAction("USER_SPECIFIC_MAINTENANCE")}
                variant="warning"
              />
            </div>
          </div>
        )}

        {/* SECTION 3: ZONE DANGEREUSE */}
        {userId && (
          <div className="bg-red-950/30 border border-red-500/20 p-6 rounded-[2.5rem] space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-red-400">Zone Dangereuse</h3>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-red-400">Supprimer cet utilisateur</p>
                <p className="text-[10px] text-red-400/60">Cette action est irreversible. Toutes les donnees seront perdues.</p>
              </div>
              <AdminButton
                label="Supprimer"
                icon={<Trash2 size={16}/>}
                onClick={handleDeleteUser}
                loading={loadingAction === "DELETE_USER"}
                variant="danger"
              />
            </div>
          </div>
        )}

        {/* SECTION 4: SYSTÈME GLOBAL */}
        <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem] space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={18} className="text-purple-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Controle Global du Reseau</h3>
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
                if(price) runAction("UPDATE_CONFIG", { amount: parseFloat(price) });
              }}
            />
            <AdminButton
              label="Airdrop Global"
              icon={<Zap size={16}/>}
              onClick={() => {
                const amt = prompt("Montant pour TOUS les utilisateurs :");
                if(amt) handleAirdropAllWith2FA(parseFloat(amt));
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
    </>
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
