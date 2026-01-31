"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle, XCircle, Eye, User,
  Calendar, MapPin, Shield, Search,
  Clock, AlertCircle, ArrowRight, Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function AdminKYCPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchKYCRequests();
  }, []);

  // Logique de recherche
  useEffect(() => {
    const filtered = requests.filter(req => 
      `${req.firstName} ${req.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRequests(filtered);
  }, [searchTerm, requests]);

  async function fetchKYCRequests() {
    try {
      const res = await fetch("/api/admin/kyc/pending");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
        setFilteredRequests(data);
      }
    } catch (error) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  const handleAction = async (status: "APPROVED" | "REJECTED") => {
    if (status === "REJECTED" && !rejectReason) {
      toast.error("Veuillez préciser le motif du rejet.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/kyc/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id, // Utilise .id selon ton schéma User
          status,
          reason: rejectReason
        })
      });

      if (res.ok) {
        toast.success(`Utilisateur ${status === "APPROVED" ? "vérifié" : "rejeté"}`);
        setSelectedUser(null);
        setRejectReason("");
        fetchKYCRequests();
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-white/5 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">
            PIMPAY<span className="text-blue-500">ADMIN</span>
          </h1>
          <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.3em]">Terminal de Vérification KYC</p>
        </div>
        
        {/* BARRE DE RECHERCHE AJUSTÉE */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un nom ou ID..." 
            className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm outline-none focus:border-blue-500/50 w-full md:w-80 transition-all placeholder:text-slate-600 font-bold" 
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LISTE DES DOSSIERS */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock size={12}/> Demandes en attente ({filteredRequests.length})
          </h2>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : filteredRequests.length > 0 ? filteredRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => setSelectedUser(req)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${selectedUser?.id === req.id ? 'bg-blue-600/10 border-blue-600/50 shadow-lg shadow-blue-600/5' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center font-black text-blue-500 uppercase text-xs">
                      {req.firstName?.[0]}{req.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">{req.firstName} {req.lastName}</p>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mt-0.5">{req.idType || "ID"} • {req.country || "RDC"}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className={selectedUser?.id === req.id ? "text-blue-500" : "text-slate-700"} />
                </div>
              </div>
            )) : (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                 <AlertCircle className="mx-auto mb-3 opacity-20" size={30} />
                 <p className="text-[10px] text-slate-600 font-black uppercase">Aucun résultat</p>
              </div>
            )}
          </div>
        </div>

        {/* PANNEAU DE COMPARAISON */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DocPreview label="Recto Document" url={selectedUser.kycFrontUrl} />
                <DocPreview label="Verso Document" url={selectedUser.kycBackUrl} />
                <DocPreview label="Selfie Vérification" url={selectedUser.kycSelfieUrl} isSelfie />
              </div>

              {/* TABLEAU DE COMPARAISON (Ajusté au schéma User) */}
              <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                <div className="grid grid-cols-2 bg-white/5 border-b border-white/10">
                    <div className="p-4 text-center text-[10px] font-black uppercase text-slate-500 border-r border-white/10 italic">Données Profil</div>
                    <div className="p-4 text-center text-[10px] font-black uppercase text-blue-500 italic">Données Document</div>
                </div>

                <div className="p-2 space-y-1">
                    <ComparisonRow label="Prénom" profile={selectedUser.firstName} kyc={selectedUser.firstName} />
                    <ComparisonRow label="Nom" profile={selectedUser.lastName} kyc={selectedUser.lastName} />
                    <ComparisonRow label="Naissance" profile={selectedUser.birthDate ? new Date(selectedUser.birthDate).toLocaleDateString() : 'N/A'} kyc="Vérifier sur Image" />
                    <ComparisonRow label="Numéro ID" profile={selectedUser.idNumber || "Non saisi"} kyc={selectedUser.idNumber} highlight />
                    <ComparisonRow label="Ville / Adresse" profile={selectedUser.city} kyc={`${selectedUser.address || ''}`} />
                </div>
              </div>

              {/* ACTIONS FINALES */}
              <div className="bg-slate-900/50 p-6 rounded-[32px] border border-white/5 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[9px] font-black text-rose-500 uppercase ml-2 italic">Motif du rejet (obligatoire)</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Pourquoi refusez-vous ce dossier ?"
                    className="w-full bg-[#020617] border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-rose-500/50 min-h-[100px] resize-none font-bold text-white transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-3 w-full md:w-64">
                    <button
                      onClick={() => handleAction("REJECTED")}
                      disabled={isProcessing}
                      className="h-14 bg-rose-600/10 border border-rose-600/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle size={16} /> Rejeter
                    </button>
                    <button
                      onClick={() => handleAction("APPROVED")}
                      disabled={isProcessing}
                      className="h-14 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-600/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                      Approuver
                    </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center text-slate-700 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Shield size={32} className="opacity-20" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sélectionnez un dossier PimPay</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function DocPreview({ label, url, isSelfie }: any) {
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-slate-500 uppercase text-center tracking-tighter italic">{label}</p>
      <div
        onClick={() => url && window.open(url, "_blank")}
        className="aspect-[4/3] rounded-3xl bg-slate-900 border border-white/10 overflow-hidden relative group cursor-pointer shadow-2xl"
      >
        <img 
            src={url || "https://placehold.co/400x300/020617/3b82f6?text=Aucun+Fichier"} 
            alt={label} 
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isSelfie ? 'scale-x-[-1]' : ''}`} 
        />
        <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px]">
          <Eye className="text-white" size={24} />
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({ label, profile, kyc, highlight }: any) {
    return (
        <div className="grid grid-cols-2 gap-2 group">
            <div className={`p-3 rounded-xl bg-white/[0.02] text-xs font-bold flex flex-col border border-transparent`}>
                <span className="text-[7px] uppercase text-slate-600 mb-1">{label} (Profil)</span>
                {profile || "Non renseigné"}
            </div>
            <div className={`p-3 rounded-xl text-xs font-bold flex flex-col border ${highlight ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5 bg-white/[0.04]'}`}>
                <span className="text-[7px] uppercase text-blue-500/50 mb-1">{label} (Document)</span>
                {kyc || "Non saisi"}
            </div>
        </div>
    );
}
