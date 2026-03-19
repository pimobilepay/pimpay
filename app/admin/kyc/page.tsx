"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, XCircle, Eye, User,
  Calendar, MapPin, Shield, Search,
  Clock, AlertCircle, ArrowRight, Loader2, ArrowLeft, RefreshCw,
  BadgeCheck, Ban, FileText, Phone, Mail, Globe, Briefcase
} from "lucide-react";
import { toast } from "sonner";

interface KYCUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  birthDate: string | null;
  gender: string | null;
  nationality: string | null;
  occupation: string | null;
  idType: string | null;
  idNumber: string | null;
  idCountry: string | null;
  idDeliveryDate: string | null;
  idExpiryDate: string | null;
  kycFrontUrl: string | null;
  kycBackUrl: string | null;
  kycSelfieUrl: string | null;
  kycSubmittedAt: string | null;
  kycVerifiedAt: string | null;
  kycReason: string | null;
  kycStatus: string;
  role: string;
  status: string;
  createdAt: string;
}

interface KYCStats {
  total: number;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
}

export default function AdminKYCPage() {
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<KYCUser[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<KYCUser[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<KYCUser[]>([]);
  const [stats, setStats] = useState<KYCStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<KYCUser | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "verified" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchKYCData();
  }, []);

  async function fetchKYCData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/kyc/all");
      if (res.ok) {
        const data = await res.json();
        setPendingUsers(data.pending || []);
        setVerifiedUsers(data.verified || []);
        setRejectedUsers(data.rejected || []);
        setStats(data.stats);
      }
    } catch (error) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  // Filtrer les utilisateurs selon l'onglet actif et la recherche
  const getCurrentList = () => {
    let list: KYCUser[] = [];
    if (activeTab === "pending") list = pendingUsers;
    else if (activeTab === "verified") list = verifiedUsers;
    else list = rejectedUsers;

    if (!searchTerm) return list;
    return list.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.idNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleAction = async (status: "APPROVED" | "REJECTED") => {
    if (!selectedUser) return;
    if (status === "REJECTED" && !rejectReason) {
      toast.error("Veuillez preciser le motif du rejet.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/kyc/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          status,
          reason: rejectReason,
        }),
      });

      if (res.ok) {
        toast.success(`Utilisateur ${status === "APPROVED" ? "verifie" : "rejete"}`);
        setSelectedUser(null);
        setRejectReason("");
        fetchKYCData();
      }
    } catch (error) {
      toast.error("Erreur lors de la mise a jour");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredList = getCurrentList();

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-7xl mx-auto">
          <button
            onClick={() => router.push("/admin")}
            className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Verification KYC</h1>
          </div>
          <button
            onClick={() => fetchKYCData()}
            className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard icon={<FileText size={16} />} label="Total KYC" value={stats.total} color="blue" />
            <StatCard icon={<Clock size={16} />} label="En Attente" value={stats.pendingCount} color="amber" />
            <StatCard icon={<BadgeCheck size={16} />} label="Valides" value={stats.verifiedCount} color="emerald" />
            <StatCard icon={<Ban size={16} />} label="Rejetes" value={stats.rejectedCount} color="rose" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <TabButton
            active={activeTab === "pending"}
            onClick={() => {
              setActiveTab("pending");
              setSelectedUser(null);
            }}
            icon={<Clock size={14} />}
            label="En Attente"
            count={pendingUsers.length}
            color="amber"
          />
          <TabButton
            active={activeTab === "verified"}
            onClick={() => {
              setActiveTab("verified");
              setSelectedUser(null);
            }}
            icon={<BadgeCheck size={14} />}
            label="KYC Valides"
            count={verifiedUsers.length}
            color="emerald"
          />
          <TabButton
            active={activeTab === "rejected"}
            onClick={() => {
              setActiveTab("rejected");
              setSelectedUser(null);
            }}
            icon={<Ban size={14} />}
            label="Rejetes"
            count={rejectedUsers.length}
            color="rose"
          />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, telephone, email ou numero ID..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LISTE DES DOSSIERS */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              {activeTab === "pending" && <Clock size={12} />}
              {activeTab === "verified" && <BadgeCheck size={12} />}
              {activeTab === "rejected" && <Ban size={12} />}
              {activeTab === "pending" && "Demandes en attente"}
              {activeTab === "verified" && "KYC Valides"}
              {activeTab === "rejected" && "KYC Rejetes"}
              <span className="ml-auto text-slate-600">({filteredList.length})</span>
            </h2>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="animate-spin text-blue-500" />
                </div>
              ) : filteredList.length > 0 ? (
                filteredList.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    isSelected={selectedUser?.id === user.id}
                    onClick={() => setSelectedUser(user)}
                    showStatus={activeTab !== "pending"}
                  />
                ))
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                  <AlertCircle className="mx-auto mb-3 opacity-20" size={30} />
                  <p className="text-[10px] text-slate-600 font-black uppercase">Aucun resultat</p>
                </div>
              )}
            </div>
          </div>

          {/* PANNEAU DE DETAILS */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Documents */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DocPreview label="Recto Document" url={selectedUser.kycFrontUrl} />
                  <DocPreview label="Verso Document" url={selectedUser.kycBackUrl} />
                  <DocPreview label="Selfie Verification" url={selectedUser.kycSelfieUrl} isSelfie />
                </div>

                {/* Informations detaillees */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                  <div className="p-4 border-b border-white/10 bg-white/[0.02]">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      Informations Completes
                    </h3>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoRow icon={<User size={14} />} label="Nom complet" value={`${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`} />
                    <InfoRow icon={<Phone size={14} />} label="Telephone" value={selectedUser.phone} />
                    <InfoRow icon={<Mail size={14} />} label="Email" value={selectedUser.email} />
                    <InfoRow icon={<Calendar size={14} />} label="Date de naissance" value={selectedUser.birthDate ? new Date(selectedUser.birthDate).toLocaleDateString("fr-FR") : null} />
                    <InfoRow icon={<Globe size={14} />} label="Nationalite" value={selectedUser.nationality} />
                    <InfoRow icon={<Briefcase size={14} />} label="Profession" value={selectedUser.occupation} />
                    <InfoRow icon={<MapPin size={14} />} label="Adresse" value={`${selectedUser.address || ""}, ${selectedUser.city || ""}, ${selectedUser.country || ""}`} />
                    <InfoRow icon={<FileText size={14} />} label="Type de document" value={selectedUser.idType} highlight />
                    <InfoRow icon={<Shield size={14} />} label="Numero ID" value={selectedUser.idNumber} highlight />
                    <InfoRow icon={<Globe size={14} />} label="Pays emission" value={selectedUser.idCountry} />
                    <InfoRow icon={<Calendar size={14} />} label="Date emission" value={selectedUser.idDeliveryDate ? new Date(selectedUser.idDeliveryDate).toLocaleDateString("fr-FR") : null} />
                    <InfoRow icon={<Calendar size={14} />} label="Date expiration" value={selectedUser.idExpiryDate ? new Date(selectedUser.idExpiryDate).toLocaleDateString("fr-FR") : null} />
                    <InfoRow icon={<Clock size={14} />} label="Soumis le" value={selectedUser.kycSubmittedAt ? new Date(selectedUser.kycSubmittedAt).toLocaleString("fr-FR") : null} />
                    {selectedUser.kycVerifiedAt && (
                      <InfoRow icon={<CheckCircle size={14} />} label="Verifie le" value={new Date(selectedUser.kycVerifiedAt).toLocaleString("fr-FR")} />
                    )}
                    {selectedUser.kycReason && (
                      <div className="col-span-2">
                        <InfoRow icon={<AlertCircle size={14} />} label="Motif" value={selectedUser.kycReason} highlight />
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions - seulement pour les PENDING */}
                {activeTab === "pending" && (
                  <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full space-y-2">
                      <label className="text-[9px] font-black text-rose-500 uppercase ml-2">Motif du rejet (obligatoire si rejet)</label>
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
                )}

                {/* Badge de statut pour verified/rejected */}
                {activeTab !== "pending" && (
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-center gap-3 ${
                      activeTab === "verified"
                        ? "bg-emerald-600/10 border-emerald-600/30 text-emerald-400"
                        : "bg-rose-600/10 border-rose-600/30 text-rose-400"
                    }`}
                  >
                    {activeTab === "verified" ? <BadgeCheck size={20} /> : <Ban size={20} />}
                    <span className="text-sm font-black uppercase tracking-wider">
                      {activeTab === "verified" ? "KYC Verifie et Approuve" : "KYC Rejete"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[500px] flex flex-col items-center justify-center text-slate-700 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Shield size={32} className="opacity-20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Selectionnez un dossier</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-600/10 border-blue-600/20 text-blue-500",
    amber: "bg-amber-600/10 border-amber-600/20 text-amber-500",
    emerald: "bg-emerald-600/10 border-emerald-600/20 text-emerald-500",
    rose: "bg-rose-600/10 border-rose-600/20 text-rose-500",
  };

  return (
    <div className={`p-4 rounded-2xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[9px] font-black uppercase">{label}</span></div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  const colors: Record<string, { active: string; inactive: string }> = {
    amber: { active: "bg-amber-600 text-white", inactive: "bg-amber-600/10 text-amber-500 border-amber-600/20" },
    emerald: { active: "bg-emerald-600 text-white", inactive: "bg-emerald-600/10 text-emerald-500 border-emerald-600/20" },
    rose: { active: "bg-rose-600 text-white", inactive: "bg-rose-600/10 text-rose-500 border-rose-600/20" },
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
        active ? colors[color].active : colors[color].inactive
      }`}
    >
      {icon}
      {label}
      <span className={`ml-1 px-2 py-0.5 rounded-full text-[9px] ${active ? "bg-white/20" : "bg-white/10"}`}>{count}</span>
    </button>
  );
}

function UserCard({
  user,
  isSelected,
  onClick,
  showStatus,
}: {
  user: KYCUser;
  isSelected: boolean;
  onClick: () => void;
  showStatus: boolean;
}) {
  const statusColors: Record<string, string> = {
    VERIFIED: "text-emerald-500",
    APPROVED: "text-emerald-500",
    REJECTED: "text-rose-500",
    PENDING: "text-amber-500",
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
        isSelected ? "bg-blue-600/10 border-blue-600/50 shadow-lg shadow-blue-600/5" : "bg-white/5 border-white/5 hover:bg-white/10"
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center font-black text-blue-500 uppercase text-xs">
            {user.firstName?.[0]}
            {user.lastName?.[0]}
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mt-0.5">
              {user.idType || "ID"} - {user.idNumber?.slice(0, 8) || "N/A"}...
            </p>
            {user.phone && <p className="text-[8px] text-slate-600 mt-0.5">{user.phone}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {showStatus && (
            <span className={`text-[8px] font-black uppercase ${statusColors[user.kycStatus]}`}>
              {user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED" ? "Valide" : "Rejete"}
            </span>
          )}
          <ArrowRight size={16} className={isSelected ? "text-blue-500" : "text-slate-700"} />
        </div>
      </div>
    </div>
  );
}

function DocPreview({ label, url, isSelfie }: { label: string; url: string | null; isSelfie?: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-slate-500 uppercase text-center tracking-tighter">{label}</p>
      <div
        onClick={() => url && window.open(url, "_blank")}
        className="aspect-[4/3] rounded-3xl bg-slate-900 border border-white/10 overflow-hidden relative group cursor-pointer shadow-2xl"
      >
        <img
          src={url || "https://placehold.co/400x300/020617/3b82f6?text=Aucun+Fichier"}
          alt={label}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isSelfie ? "scale-x-[-1]" : ""}`}
        />
        <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px]">
          <Eye className="text-white" size={24} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded-xl ${highlight ? "bg-blue-600/10 border border-blue-600/20" : "bg-white/[0.03]"}`}>
      <div className="flex items-center gap-2 text-slate-500 mb-1">
        {icon}
        <span className="text-[8px] font-black uppercase">{label}</span>
      </div>
      <p className={`text-xs font-bold ${highlight ? "text-blue-400" : "text-white"}`}>{value || "Non renseigne"}</p>
    </div>
  );
}
