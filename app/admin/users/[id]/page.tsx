import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AdminControlPanel } from "@/components/admin/AdminControlPanel";
import { UserDetailHeader } from "./header";
import { 
  User, Mail, Phone, Globe, Calendar, Shield, 
  CreditCard, Wallet, Clock, MapPin, CheckCircle2, 
  XCircle, AlertTriangle, Activity, Hash
} from "lucide-react";

export default async function AdminUserPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { 
      wallets: true,
      transactions: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!user) notFound();

  const isPiUser = !!user.piUserId;
  const isKycVerified = user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED";

  return (
    <div className="min-h-screen bg-[#020617] pb-32 text-white">
      <UserDetailHeader userName={user.name || user.username || "Utilisateur"} userId={user.id} />

      <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">

        {/* CARTE PROFIL PRINCIPAL */}
        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <User size={120} />
          </div>
          
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username || user.name || "Avatar"}
                  className="w-20 h-20 rounded-[1.5rem] object-cover border-2 border-white/10"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-2xl font-black bg-gradient-to-br from-blue-600 to-blue-900 border-2 border-white/10 text-white uppercase">
                  {user.username?.[0] || user.name?.[0] || "?"}
                </div>
              )}
              {user.status === "ACTIVE" && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-[#020617] flex items-center justify-center">
                  <CheckCircle2 size={10} className="text-white" />
                </div>
              )}
              {isPiUser && (
                <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-amber-500 rounded-full border-2 border-[#020617] flex items-center justify-center">
                  <span className="text-[8px] font-black text-white">Pi</span>
                </div>
              )}
            </div>

            {/* Infos principales */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-black uppercase tracking-tight">
                  {user.username || user.name || "Sans nom"}
                </h2>
                {isKycVerified && (
                  <span className="text-[7px] font-black px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                    KYC Verifie
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-mono mb-3">ID: {user.id}</p>
              
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={user.status} />
                <span className="text-[8px] font-black px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 uppercase tracking-wider">
                  {user.role}
                </span>
                {isPiUser && (
                  <span className="text-[8px] font-black px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 uppercase tracking-wider">
                    Pi Network
                  </span>
                )}
                {user.autoApprove && (
                  <span className="text-[8px] font-black px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20 uppercase tracking-wider">
                    Auto-Approve
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* INFORMATIONS DETAILLEES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact & Identite */}
          <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-5 space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <User size={14} className="text-blue-500" /> Identite & Contact
            </h3>
            <InfoRow icon={<User size={14} />} label="Nom complet" value={user.name || "Non renseigne"} />
            <InfoRow icon={<Hash size={14} />} label="Username" value={user.username || "Non defini"} />
            <InfoRow icon={<Mail size={14} />} label="Email" value={user.email || "Non renseigne"} />
            <InfoRow icon={<Phone size={14} />} label="Telephone" value={user.phone || "Non renseigne"} />
            <InfoRow icon={<Globe size={14} />} label="Pays" value={user.country || "Non specifie"} />
          </div>

          {/* Securite & Acces */}
          <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-5 space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Shield size={14} className="text-emerald-500" /> Securite & Acces
            </h3>
            <InfoRow icon={<Shield size={14} />} label="Statut KYC" value={user.kycStatus || "PENDING"} highlight={isKycVerified ? "success" : "warning"} />
            <InfoRow icon={<CreditCard size={14} />} label="PIN configure" value={user.pin ? "Oui" : "Non"} />
            <InfoRow icon={<MapPin size={14} />} label="Derniere IP" value={user.lastLoginIp || "Inconnue"} />
            <InfoRow icon={<Clock size={14} />} label="Derniere connexion" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fr-FR') : "Jamais"} />
            <InfoRow icon={<Calendar size={14} />} label="Inscription" value={new Date(user.createdAt).toLocaleDateString('fr-FR')} />
          </div>
        </div>

        {/* IDENTIFIANTS BLOCKCHAIN */}
        <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-5 space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Activity size={14} className="text-amber-500" /> Identifiants Blockchain
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow icon={<Hash size={14} />} label="Pi User ID" value={user.piUserId || "Non lie"} mono />
            <InfoRow icon={<Wallet size={14} />} label="Adresse Wallet" value={user.walletAddress ? `${user.walletAddress.slice(0, 12)}...${user.walletAddress.slice(-8)}` : "Non definie"} mono />
            <InfoRow icon={<Wallet size={14} />} label="Adresse Sidra" value={user.sidraAddress ? `${user.sidraAddress.slice(0, 12)}...${user.sidraAddress.slice(-8)}` : "Non definie"} mono />
            <InfoRow icon={<Wallet size={14} />} label="Adresse XLM" value={user.xlmAddress ? `${user.xlmAddress.slice(0, 12)}...${user.xlmAddress.slice(-8)}` : "Non definie"} mono />
          </div>
        </div>

        {/* PORTEFEUILLES */}
        <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-5">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Wallet size={14} className="text-blue-500" /> Portefeuilles
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {user.wallets.length > 0 ? user.wallets.map((wallet) => (
              <div key={wallet.id} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{wallet.currency}</p>
                <p className="text-lg font-black text-white">
                  {wallet.currency === "PI" ? "π " : wallet.currency === "XAF" ? "" : "$ "}
                  {Number(wallet.balance).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[8px] text-slate-600 font-mono mt-1">{wallet.type}</p>
              </div>
            )) : (
              <p className="text-slate-500 text-[10px] font-bold uppercase col-span-4 text-center py-4">Aucun portefeuille</p>
            )}
          </div>
        </div>

        {/* TRANSACTIONS RECENTES */}
        <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-5">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Activity size={14} className="text-purple-500" /> Transactions Recentes
          </h3>
          {user.transactions && user.transactions.length > 0 ? (
            <div className="space-y-2">
              {user.transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      tx.type === "DEPOSIT" ? "bg-emerald-500/10 text-emerald-500" :
                      tx.type === "WITHDRAW" ? "bg-red-500/10 text-red-500" :
                      "bg-blue-500/10 text-blue-500"
                    }`}>
                      {tx.type === "DEPOSIT" ? "+" : tx.type === "WITHDRAW" ? "-" : "~"}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white uppercase">{tx.type}</p>
                      <p className="text-[8px] text-slate-500 font-mono">{tx.reference?.slice(0, 16) || tx.id.slice(0, 16)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${tx.type === "DEPOSIT" ? "text-emerald-500" : tx.type === "WITHDRAW" ? "text-red-500" : "text-white"}`}>
                      {tx.type === "DEPOSIT" ? "+" : tx.type === "WITHDRAW" ? "-" : ""}{Number(tx.amount).toLocaleString()} {tx.currency}
                    </p>
                    <p className="text-[8px] text-slate-500">{new Date(tx.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-[10px] font-bold uppercase text-center py-4">Aucune transaction</p>
          )}
        </div>

        {/* PANNEAU DE CONTROLE ADMIN */}
        <AdminControlPanel
          userId={user.id}
          userName={user.name || user.username || "Utilisateur"}
          userEmail={user.email || "Pas d'email"}
          currentRole={user.role}
        />
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, mono = false, highlight }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  mono?: boolean;
  highlight?: "success" | "warning" | "danger";
}) {
  const highlightClass = highlight === "success" ? "text-emerald-400" : 
                         highlight === "warning" ? "text-amber-400" : 
                         highlight === "danger" ? "text-red-400" : "text-white";
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-blue-500">{icon}</span>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-[10px] font-bold ${highlightClass} ${mono ? "font-mono" : ""} truncate max-w-[180px]`}>
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    ACTIVE: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    BANNED: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
    SUSPENDED: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
    FROZEN: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
    PENDING: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
  };
  
  const { bg, text, border } = config[status] || config.PENDING;
  
  return (
    <span className={`text-[8px] font-black px-2.5 py-1 ${bg} ${text} rounded-full border ${border} uppercase tracking-wider`}>
      {status}
    </span>
  );
}
