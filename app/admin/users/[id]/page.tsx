// app/admin/users/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AdminControlPanel } from "@/components/admin/AdminControlPanel";
import { UserDetailHeader } from "./header";
import { CopyableAddress } from "./CopyableAddress";
import { BLOCKCHAIN_EXPLORERS } from "@/lib/blockchain-explorer";
import {
  User, Mail, Phone, Globe, Calendar, Shield,
  CreditCard, Wallet, Clock, MapPin, CheckCircle2,
  Activity, Hash, FileText, Briefcase, Users, Gauge,
  KeyRound, AlertTriangle, Home, Landmark, Flag, Cake,
} from "lucide-react";

// Note : Pas de "use client" ici. Prisma doit rester côté serveur.

// Les champs secrets (password, pin, refreshToken, twoFactorSecret et tous les
// *PrivateKey) ne sont VOLONTAIREMENT jamais selectionnes : ils ne doivent
// jamais quitter le serveur, meme pour un administrateur.
export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      // Identite
      id: true, firstName: true, lastName: true, lastName2: true, middleName: true,
      nativeName: true, name: true, username: true, avatar: true, gender: true,
      birthDate: true, nationality: true, countryOfBirth: true, occupation: true,
      // Contact & localisation
      email: true, emailVerified: true, phone: true, country: true, city: true,
      address: true, postalCode: true, provinceState: true,
      latitude: true, longitude: true,
      // KYC
      kycStatus: true, kycSubmittedAt: true, kycVerifiedAt: true, kycReason: true,
      kycFrontUrl: true, kycBackUrl: true, kycSelfieUrl: true,
      idType: true, idNumber: true, idCountry: true,
      idDeliveryDate: true, idExpiryDate: true, sourceOfFunds: true,
      // Adresses blockchain
      walletAddress: true, piUserId: true, sidraAddress: true, xlmAddress: true,
      xrpAddress: true, usdtAddress: true, solAddress: true,
      // Roles, statut, limites
      role: true, status: true, statusReason: true, autoApprove: true,
      agentId: true, agentRole: true, agentType: true,
      dailyLimit: true, monthlyLimit: true,
      referralCode: true, referredById: true,
      // Securite (metadonnees uniquement, jamais les secrets)
      pin: true, pinUpdatedAt: true, pinVersion: true,
      twoFactorEnabled: true, failedLoginAttempts: true, lockedUntil: true,
      mustChangePassword: true, maintenanceUntil: true,
      lastLoginAt: true, lastLoginIp: true, createdAt: true, updatedAt: true,
      // Relations
      wallets: true,
      referredBy: { select: { id: true, username: true, name: true, email: true } },
      _count: { select: { referrals: true, transactionsFrom: true, transactionsTo: true, beneficiaries: true } },
      transactionsFrom: { take: 10, orderBy: { createdAt: "desc" } },
    },
  });

  if (!user) notFound();

  // Whitelist de retrait : ce modele n'a pas de relation Prisma vers User,
  // on interroge donc la table separement par userId.
  const withdrawalAddresses = await prisma.withdrawalAddress.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
  });

  const isPiUser = !!user.piUserId;
  const isKycVerified = user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED";
  const isLocked = !!user.lockedUntil && new Date(user.lockedUntil) > new Date();

  // Toutes les adresses blockchain du compte, affichees en entier.
  const chainAddresses = [
    { label: "Pi Wallet", address: user.walletAddress, currency: "PI", network: "Pi Network" },
    { label: "Sidra Chain", address: user.sidraAddress, currency: "SDA", network: "Sidra" },
    { label: "Stellar", address: user.xlmAddress, currency: "XLM", network: "Stellar" },
    { label: "XRP Ledger", address: user.xrpAddress, currency: "XRP", network: "XRPL" },
    { label: "USDT", address: user.usdtAddress, currency: "USDT", network: "TRC20" },
    { label: "Solana", address: user.solAddress, currency: "SOL", network: "Solana" },
  ];

  const fullName = [user.firstName, user.middleName, user.lastName, user.lastName2]
    .filter(Boolean).join(" ") || user.name || "Non renseigne";

  const fullAddress = [user.address, user.city, user.provinceState, user.postalCode, user.country]
    .filter(Boolean).join(", ") || "Non renseignee";

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
              <p className="text-[10px] text-slate-500 font-mono mb-3 break-all">ID: {user.id}</p>

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
                {isLocked && (
                  <span className="text-[8px] font-black px-2.5 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 uppercase tracking-wider">
                    Verrouille
                  </span>
                )}
                {user.agentId && (
                  <span className="text-[8px] font-black px-2.5 py-1 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20 uppercase tracking-wider">
                    Agent {user.agentRole}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Compteurs rapides */}
          <div className="grid grid-cols-4 gap-2 mt-6 pt-5 border-t border-white/5">
            <MiniStat label="Envois" value={user._count.transactionsFrom} />
            <MiniStat label="Recus" value={user._count.transactionsTo} />
            <MiniStat label="Filleuls" value={user._count.referrals} />
            <MiniStat label="Benefic." value={user._count.beneficiaries} />
          </div>
        </div>

        {/* IDENTITE COMPLETE */}
        <Section icon={<User size={14} className="text-blue-500" />} title="Identite complete">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow icon={<User size={14} />} label="Nom complet" value={fullName} />
            <InfoRow icon={<Hash size={14} />} label="Prenom" value={user.firstName} />
            <InfoRow icon={<Hash size={14} />} label="Nom" value={user.lastName} />
            <InfoRow icon={<Hash size={14} />} label="2e nom de famille" value={user.lastName2} />
            <InfoRow icon={<Hash size={14} />} label="Nom du milieu" value={user.middleName} />
            <InfoRow icon={<Hash size={14} />} label="Nom natif" value={user.nativeName} />
            <InfoRow icon={<Hash size={14} />} label="Username" value={user.username} />
            <InfoRow icon={<User size={14} />} label="Genre" value={user.gender} />
            <InfoRow icon={<Cake size={14} />} label="Date de naissance" value={fmtDate(user.birthDate)} />
            <InfoRow icon={<Flag size={14} />} label="Nationalite" value={user.nationality} />
            <InfoRow icon={<Globe size={14} />} label="Pays de naissance" value={user.countryOfBirth} />
            <InfoRow icon={<Briefcase size={14} />} label="Profession" value={user.occupation} />
          </div>
        </Section>

        {/* CONTACT & ADRESSE POSTALE */}
        <Section icon={<Home size={14} className="text-emerald-500" />} title="Contact & adresse postale">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow icon={<Mail size={14} />} label="Email" value={user.email} breakAll />
            <InfoRow
              icon={<CheckCircle2 size={14} />}
              label="Email verifie"
              value={user.emailVerified ? fmtDateTime(user.emailVerified) : "Non verifie"}
              highlight={user.emailVerified ? "success" : "warning"}
            />
            <InfoRow icon={<Phone size={14} />} label="Telephone" value={user.phone} />
            <InfoRow icon={<Globe size={14} />} label="Pays" value={user.country} />
            <InfoRow icon={<MapPin size={14} />} label="Ville" value={user.city} />
            <InfoRow icon={<MapPin size={14} />} label="Province / Etat" value={user.provinceState} />
            <InfoRow icon={<Hash size={14} />} label="Code postal" value={user.postalCode} />
            <InfoRow icon={<Home size={14} />} label="Adresse (ligne)" value={user.address} breakAll />
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Adresse postale complete
              </p>
              <p className="text-[11px] font-bold text-white leading-relaxed">{fullAddress}</p>
            </div>
            {user.latitude != null && user.longitude != null && (
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  Coordonnees GPS
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${user.latitude},${user.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono text-blue-400 hover:text-blue-300 underline decoration-dotted"
                >
                  {user.latitude}, {user.longitude}
                </a>
              </div>
            )}
          </div>
        </Section>

        {/* KYC & PIECE D'IDENTITE */}
        <Section icon={<FileText size={14} className="text-amber-500" />} title="KYC & piece d'identite">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow
              icon={<Shield size={14} />}
              label="Statut KYC"
              value={user.kycStatus || "NONE"}
              highlight={isKycVerified ? "success" : "warning"}
            />
            <InfoRow icon={<Clock size={14} />} label="Soumis le" value={fmtDateTime(user.kycSubmittedAt)} />
            <InfoRow icon={<CheckCircle2 size={14} />} label="Verifie le" value={fmtDateTime(user.kycVerifiedAt)} />
            <InfoRow icon={<AlertTriangle size={14} />} label="Motif / rejet" value={user.kycReason} />
            <InfoRow icon={<FileText size={14} />} label="Type de piece" value={user.idType} />
            <InfoRow icon={<Hash size={14} />} label="N. de piece" value={user.idNumber} mono />
            <InfoRow icon={<Flag size={14} />} label="Pays d'emission" value={user.idCountry} />
            <InfoRow icon={<Calendar size={14} />} label="Delivree le" value={fmtDate(user.idDeliveryDate)} />
            <InfoRow icon={<Calendar size={14} />} label="Expire le" value={fmtDate(user.idExpiryDate)} />
            <InfoRow icon={<Landmark size={14} />} label="Origine des fonds" value={user.sourceOfFunds} />
          </div>
          {(user.kycFrontUrl || user.kycBackUrl || user.kycSelfieUrl) && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
                Documents fournis
              </p>
              <div className="grid grid-cols-3 gap-3">
                <KycDoc label="Recto" url={user.kycFrontUrl} />
                <KycDoc label="Verso" url={user.kycBackUrl} />
                <KycDoc label="Selfie" url={user.kycSelfieUrl} />
              </div>
            </div>
          )}
        </Section>

        {/* ADRESSES BLOCKCHAIN — COMPLETES */}
        <Section icon={<Activity size={14} className="text-amber-500" />} title="Adresses blockchain">
          <div className="mb-3">
            <CopyableAddress label="Pi User ID" address={user.piUserId} network="Pi Network" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {chainAddresses.map((a) => (
              <CopyableAddress
                key={a.label}
                label={a.label}
                address={a.address}
                network={a.network}
                explorerUrl={
                  a.address && BLOCKCHAIN_EXPLORERS[a.currency]
                    ? BLOCKCHAIN_EXPLORERS[a.currency].addressUrl(a.address)
                    : null
                }
              />
            ))}
          </div>
        </Section>

        {/* WHITELIST DE RETRAIT */}
        <Section icon={<Shield size={14} className="text-cyan-500" />} title="Adresses de retrait autorisees">
          {withdrawalAddresses.length > 0 ? (
            <div className="space-y-3">
              {withdrawalAddresses.map((wa) => (
                <div key={wa.id}>
                  <CopyableAddress
                    label={`${wa.asset}${wa.label ? ` - ${wa.label}` : ""} [${wa.status}]`}
                    address={wa.address}
                    network={wa.network || undefined}
                    explorerUrl={
                      BLOCKCHAIN_EXPLORERS[wa.asset.toUpperCase()]
                        ? BLOCKCHAIN_EXPLORERS[wa.asset.toUpperCase()].addressUrl(wa.address)
                        : null
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-[10px] font-bold uppercase text-center py-4">
              Aucune adresse en whitelist
            </p>
          )}
        </Section>

        {/* SECURITE & ACCES */}
        <Section icon={<KeyRound size={14} className="text-emerald-500" />} title="Securite & acces">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow icon={<CreditCard size={14} />} label="PIN configure" value={user.pin ? "Oui" : "Non"} highlight={user.pin ? "success" : "warning"} />
            <InfoRow icon={<Clock size={14} />} label="PIN modifie le" value={fmtDateTime(user.pinUpdatedAt)} />
            <InfoRow icon={<Hash size={14} />} label="Version PIN" value={String(user.pinVersion)} />
            <InfoRow icon={<Shield size={14} />} label="2FA active" value={user.twoFactorEnabled ? "Oui" : "Non"} highlight={user.twoFactorEnabled ? "success" : undefined} />
            <InfoRow icon={<AlertTriangle size={14} />} label="Echecs de connexion" value={String(user.failedLoginAttempts)} highlight={user.failedLoginAttempts > 0 ? "warning" : undefined} />
            <InfoRow icon={<AlertTriangle size={14} />} label="Verrouille jusqu'au" value={fmtDateTime(user.lockedUntil)} highlight={isLocked ? "danger" : undefined} />
            <InfoRow icon={<KeyRound size={14} />} label="Doit changer mot de passe" value={user.mustChangePassword ? "Oui" : "Non"} />
            <InfoRow icon={<Clock size={14} />} label="Maintenance jusqu'au" value={fmtDateTime(user.maintenanceUntil)} />
            <InfoRow icon={<MapPin size={14} />} label="Derniere IP" value={user.lastLoginIp} mono breakAll />
            <InfoRow icon={<Clock size={14} />} label="Derniere connexion" value={fmtDateTime(user.lastLoginAt)} />
            <InfoRow icon={<Calendar size={14} />} label="Inscription" value={fmtDateTime(user.createdAt)} />
            <InfoRow icon={<Clock size={14} />} label="Derniere maj" value={fmtDateTime(user.updatedAt)} />
            <InfoRow icon={<AlertTriangle size={14} />} label="Motif du statut" value={user.statusReason} />
          </div>
        </Section>

        {/* LIMITES, ROLES & PARRAINAGE */}
        <Section icon={<Gauge size={14} className="text-violet-500" />} title="Limites, roles & parrainage">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow icon={<Gauge size={14} />} label="Limite journaliere" value={`${user.dailyLimit.toLocaleString("fr-FR")}`} />
            <InfoRow icon={<Gauge size={14} />} label="Limite mensuelle" value={`${user.monthlyLimit.toLocaleString("fr-FR")}`} />
            <InfoRow icon={<Shield size={14} />} label="Role" value={user.role} />
            <InfoRow icon={<Users size={14} />} label="ID Agent" value={user.agentId} mono />
            <InfoRow icon={<Users size={14} />} label="Role agent" value={user.agentRole} />
            <InfoRow icon={<Users size={14} />} label="Type agent" value={user.agentType} />
            <InfoRow icon={<Hash size={14} />} label="Code de parrainage" value={user.referralCode} mono breakAll />
            <InfoRow
              icon={<Users size={14} />}
              label="Parraine par"
              value={user.referredBy ? (user.referredBy.username || user.referredBy.name || user.referredBy.email) : null}
            />
            <InfoRow icon={<Users size={14} />} label="Nombre de filleuls" value={String(user._count.referrals)} />
          </div>
        </Section>

        {/* PORTEFEUILLES */}
        <Section icon={<Wallet size={14} className="text-blue-500" />} title="Portefeuilles">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {user.wallets.length > 0 ? user.wallets.map((wallet) => (
              <div key={wallet.id} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{wallet.currency}</p>
                <p className="text-sm font-black text-white break-all">
                  {getCurrencySymbol(wallet.currency)}
                  {Number(wallet.balance).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[8px] text-slate-600 font-mono mt-1">{wallet.type}</p>
              </div>
            )) : (
              <p className="text-slate-500 text-[10px] font-bold uppercase col-span-4 text-center py-4">Aucun portefeuille</p>
            )}
          </div>
        </Section>

        {/* TRANSACTIONS */}
        <Section icon={<Activity size={14} className="text-purple-500" />} title="Transactions recentes">
          {user.transactionsFrom && user.transactionsFrom.length > 0 ? (
            <div className="space-y-2">
              {user.transactionsFrom.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === "DEPOSIT" ? "bg-emerald-500/10 text-emerald-500" :
                      tx.type === "WITHDRAW" ? "bg-red-500/10 text-red-500" :
                      "bg-blue-500/10 text-blue-500"
                    }`}>
                      {tx.type === "DEPOSIT" ? "+" : tx.type === "WITHDRAW" ? "-" : "~"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-white uppercase">{tx.type}</p>
                      <p className="text-[8px] text-slate-500 font-mono truncate">{tx.reference || tx.id}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
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
        </Section>

        {/* PANNEAU DE CONTROLE ADMIN (Composant Client séparé) */}
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

// ---------- Helpers de formatage ----------

function fmtDate(d: Date | null | undefined): string | null {
  return d ? new Date(d).toLocaleDateString("fr-FR") : null;
}

function fmtDateTime(d: Date | null | undefined): string | null {
  return d ? new Date(d).toLocaleString("fr-FR") : null;
}

// Retourne le symbole ou préfixe approprié pour chaque devise/crypto
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    PI:   "π ",
    XAF:  "FCFA ",
    XLM:  "XLM ",
    SDA:  "SDA ",
    DAI:  "DAI ",
    XRP:  "XRP ",
    USDC: "USDC ",
    USDT: "USDT ",
    BTC:  "BTC ",
    BUSD: "BUSD ",
    SOL:  "SOL ",
    ETH:  "ETH ",
    BNB:  "BNB ",
    TRX:  "TRX ",
    USD:  "$ ",
    EUR:  "€ ",
    GBP:  "£ ",
  };
  return symbols[currency.toUpperCase()] ?? `${currency} `;
}

// ---------- Composants de presentation ----------

function Section({ icon, title, children }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-5">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function KycDoc({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <div className="aspect-square rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-1">
        <FileText size={16} className="text-slate-700" />
        <span className="text-[8px] font-black text-slate-600 uppercase">{label}</span>
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group aspect-square rounded-2xl overflow-hidden border border-white/10 relative block"
    >
      <img src={url} alt={`Document KYC ${label}`} className="w-full h-full object-cover" crossOrigin="anonymous" />
      <div className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center">
        <span className="text-[8px] font-black text-white uppercase tracking-widest">{label}</span>
      </div>
    </a>
  );
}

function InfoRow({ icon, label, value, mono = false, breakAll = false, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  breakAll?: boolean;
  highlight?: "success" | "warning" | "danger";
}) {
  const isEmpty = value === null || value === undefined || value === "";
  const highlightClass = isEmpty ? "text-slate-600" :
                         highlight === "success" ? "text-emerald-400" :
                         highlight === "warning" ? "text-amber-400" :
                         highlight === "danger" ? "text-red-400" : "text-white";

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-blue-500">{icon}</span>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <span
        className={`text-[10px] font-bold text-right ${highlightClass} ${mono ? "font-mono" : ""} ${
          breakAll ? "break-all" : ""
        }`}
      >
        {isEmpty ? "Non renseigne" : value}
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
