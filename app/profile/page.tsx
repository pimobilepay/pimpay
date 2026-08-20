"use client";

import { useState, useEffect, useRef } from "react";
import {
  User, Shield, Bell, ChevronRight, LogOut, CheckCircle2,
  Wallet, Fingerprint, Globe, CreditCard, Calendar, MapPin, UserPen, Loader2,
  Briefcase, BadgeCheck, FileText, Hash, Lock, X, Check, ChevronDown, Gift
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useCurrency, CURRENCIES, type CurrencyCode } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
import LogoutOverlay from "@/components/LogoutOverlay";
import { ReferralProgram } from "@/components/ReferralProgram";
import { PaymentQRModal } from "@/components/profile/PaymentQRModal";
import { QrCode } from "lucide-react";
import { DeleteAccountControl } from "@/components/profile/DeleteAccountControl";
import { performClientLogout } from "@/lib/client-logout";

interface UserData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  joinedAt: string;
  isVerified: boolean;
  kycStatus: string;
  country: string;
  city: string;
  address: string;
  postalCode: string;
  nationality: string;
  gender: string;
  birthDate?: string;
  occupation: string;
  sourceOfFunds: string;
  idType: string;
  idNumber: string;
  walletAddress: string;
  role: string;
  avatar?: string;
  createdAt?: string;
  referralCode?: string;
  referralCount?: number;
  agentId?: string;
  agentRole?: string;
}

interface ProfileItem {
  label: string;
  icon: React.ReactNode;
  value?: string;
  path?: string;
  toggle?: boolean;
  active?: boolean;
  accent?: string;
  fieldKey?: string;
  editable?: boolean;
  inputType?: "text" | "email" | "tel" | "date" | "select" | "currency";
  options?: { value: string; label: string }[];
  readOnly?: boolean;
}

interface ProfileSection {
  title: string;
  icon: React.ReactNode;
  items: ProfileItem[];
}

function formatGender(g: string, t: (key: string) => string) {
  if (g === "M") return t("profile.genderMale");
  if (g === "F") return t("profile.genderFemale");
  if (g === "OTHER") return t("profile.genderOther");
  return t("profile.notSpecified");
}

function formatOccupation(o: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    EMPLOYEE: t("profile.occupationEmployee"),
    SELF_EMPLOYED: t("profile.occupationSelfEmployed"),
    BUSINESS_OWNER: t("profile.occupationBusinessOwner"),
    FREELANCE: t("profile.occupationFreelance"),
    STUDENT: t("profile.occupationStudent"),
    RETIRED: t("profile.occupationRetired"),
    UNEMPLOYED: t("profile.occupationUnemployed"),
    OTHER: t("profile.occupationOther"),
  };
  return map[o] || o || t("profile.notSpecified");
}

function formatSourceOfFunds(s: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    SALARY: t("profile.fundsSalary"),
    BUSINESS_INCOME: t("profile.fundsBusinessIncome"),
    INVESTMENTS: t("profile.fundsInvestments"),
    SAVINGS: t("profile.fundsSavings"),
    CRYPTO_MINING: t("profile.fundsCryptoMining"),
    FAMILY_SUPPORT: t("profile.fundsFamilySupport"),
    OTHER: t("profile.fundsOther"),
  };
  return map[s] || s || t("profile.notSpecified");
}

function formatIdType(t_value: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    NATIONAL_ID: t("profile.idNationalId"),
    PASSPORT: t("profile.idPassport"),
    DRIVERS_LICENSE: t("profile.idDriversLicense"),
    RESIDENCE_PERMIT: t("profile.idResidencePermit"),
  };
  return map[t_value] || t_value || t("profile.notSpecified");
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { currency, currencyInfo, setCurrency } = useCurrency();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [piNetwork, setPiNetwork] = useState<"testnet" | "mainnet">("testnet");
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const currencySelectorRef = useRef<HTMLDivElement>(null);

  // Options pour les champs select
  const genderOptions = [
    { value: "M", label: t("profile.genderMale") },
    { value: "F", label: t("profile.genderFemale") },
    { value: "OTHER", label: t("profile.genderOther") },
  ];

  const occupationOptions = [
    { value: "EMPLOYEE", label: t("profile.occupationEmployee") },
    { value: "SELF_EMPLOYED", label: t("profile.occupationSelfEmployed") },
    { value: "BUSINESS_OWNER", label: t("profile.occupationBusinessOwner") },
    { value: "FREELANCE", label: t("profile.occupationFreelance") },
    { value: "STUDENT", label: t("profile.occupationStudent") },
    { value: "RETIRED", label: t("profile.occupationRetired") },
    { value: "UNEMPLOYED", label: t("profile.occupationUnemployed") },
    { value: "OTHER", label: t("profile.occupationOther") },
  ];

  const sourceOfFundsOptions = [
    { value: "SALARY", label: t("profile.fundsSalary") },
    { value: "BUSINESS_INCOME", label: t("profile.fundsBusinessIncome") },
    { value: "INVESTMENTS", label: t("profile.fundsInvestments") },
    { value: "SAVINGS", label: t("profile.fundsSavings") },
    { value: "CRYPTO_MINING", label: t("profile.fundsCryptoMining") },
    { value: "FAMILY_SUPPORT", label: t("profile.fundsFamilySupport") },
    { value: "OTHER", label: t("profile.fundsOther") },
  ];

  const idTypeOptions = [
    { value: "NATIONAL_ID", label: t("profile.idNationalId") },
    { value: "PASSPORT", label: t("profile.idPassport") },
    { value: "DRIVERS_LICENSE", label: t("profile.idDriversLicense") },
    { value: "RESIDENCE_PERMIT", label: t("profile.idResidencePermit") },
  ];

  const handleStartEdit = (fieldKey: string, currentValue: string, inputType?: string) => {
    setEditingField(fieldKey);
    setEditValue(currentValue || "");
    setTimeout(() => {
      if (inputType === "select") {
        selectRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleSaveEdit = async () => {
    if (!editingField || !user) return;

    setSaving(true);
    try {
      const updateData: Record<string, string> = {
        id: user.id,
        [editingField]: editValue,
      };

      const res = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error(t("profile.updateError"));

      // Mettre a jour l'utilisateur local
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, [editingField]: editValue };
        // Mettre a jour le nom complet si firstName ou lastName change
        if (editingField === "firstName" || editingField === "lastName") {
          updated.name = `${updated.firstName || ""} ${updated.lastName || ""}`.trim();
        }
        return updated;
      });

      toast.success(t("profile.infoUpdated"));
      setEditingField(null);
      setEditValue("");
    } catch {
      toast.error(t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  // Fermer le sélecteur de devise quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currencySelectorRef.current && !currencySelectorRef.current.contains(event.target as Node)) {
        setShowCurrencySelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile", {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.status === 401) {
          toast.error(t("profile.sessionExpired"));
          window.location.href = "/auth/login";
          return;
        }
        
        const result = await res.json();
        const userData = result.user || result;

        if (res.ok && userData) {
          const fullName =
            userData.name ||
            (userData.firstName && userData.lastName
              ? `${userData.firstName} ${userData.lastName}`
              : userData.username || "Pioneer");

          setUser({
            ...userData,
            name: fullName,
            joinedAt: new Date(userData.createdAt || Date.now()).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            }),
            isVerified: userData.kycStatus === "VERIFIED" || userData.kycStatus === "APPROVED",
          });
        } else {
          toast.error(t("profile.sessionExpiredShort"));
          window.location.href = "/auth/login";
        }
      } catch {
        toast.error(t("profile.networkSyncError"));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Reseau Pi actif (testnet/mainnet) — pilote par l'admin depuis
  // Admin > Reglages et expose via /api/pi-network. Jamais code en dur ici :
  // si l'admin bascule le reseau, cet appel refletera la nouvelle valeur au
  // prochain chargement de la page.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/pi-network", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && (data?.network === "mainnet" || data?.network === "testnet")) {
          setPiNetwork(data.network);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const profileSections: ProfileSection[] = [
    {
      title: t("profile.personalIdentity"),
      icon: <User size={12} />,
      items: [
        { label: t("profile.username"), icon: <Fingerprint size={18} />, value: user?.username ? `@${user.username}` : t("profile.notSpecified"), fieldKey: "username", editable: true, inputType: "text" },
        { label: t("profile.firstName"), icon: <User size={18} />, value: user?.firstName || t("profile.notSpecified"), fieldKey: "firstName", editable: true, inputType: "text" },
        { label: t("profile.lastName"), icon: <User size={18} />, value: user?.lastName || t("profile.notSpecified"), fieldKey: "lastName", editable: true, inputType: "text" },
        { label: t("profile.gender"), icon: <User size={18} />, value: formatGender(user?.gender || "", t), fieldKey: "gender", editable: true, inputType: "select", options: genderOptions },
        { label: t("profile.birthDate"), icon: <Calendar size={18} />, value: user?.birthDate ? new Date(user.birthDate).toLocaleDateString("fr-FR") : t("profile.notSpecifiedFem"), fieldKey: "birthDate", editable: true, inputType: "date" },
        { label: t("profile.nationality"), icon: <Globe size={18} />, value: user?.nationality || t("profile.notSpecifiedFem"), fieldKey: "nationality", editable: true, inputType: "text" },
      ],
    },
    {
      title: t("profile.addressLocation"),
      icon: <MapPin size={12} />,
      items: [
        { label: t("profile.residenceAddress"), icon: <MapPin size={18} />, value: user?.address || t("profile.notSpecifiedFem"), fieldKey: "address", editable: true, inputType: "text" },
        { label: t("profile.postalCode"), icon: <Hash size={18} />, value: user?.postalCode || t("profile.notSpecified"), fieldKey: "postalCode", editable: true, inputType: "text" },
      ],
    },
    {
      title: t("profile.financialInfo"),
      icon: <Briefcase size={12} />,
      items: [
        { label: t("profile.occupation"), icon: <Briefcase size={18} />, value: formatOccupation(user?.occupation || "", t), fieldKey: "occupation", editable: true, inputType: "select", options: occupationOptions },
        { label: t("profile.sourceOfFunds"), icon: <CreditCard size={18} />, value: formatSourceOfFunds(user?.sourceOfFunds || "", t), accent: "text-amber-400", fieldKey: "sourceOfFunds", editable: true, inputType: "select", options: sourceOfFundsOptions },
      ],
    },
    {
      title: t("profile.identityDocument"),
      icon: <FileText size={12} />,
      items: [
        { label: t("profile.documentType"), icon: <BadgeCheck size={18} />, value: formatIdType(user?.idType || "", t), fieldKey: "idType", editable: true, inputType: "select", options: idTypeOptions },
        { label: t("profile.documentNumber"), icon: <Shield size={18} />, value: user?.idNumber ? `${user.idNumber.substring(0, 3)}****${user.idNumber.slice(-2)}` : t("profile.notSpecified"), fieldKey: "idNumber", editable: true, inputType: "text" },
      ],
    },
    {
      title: t("profile.securityWeb3"),
      icon: <Wallet size={12} />,
      items: [
        { label: t("profile.transactionPin"), icon: <Shield size={18} />, value: t("profile.secured"), active: true, path: "/profile/change-pin" },
        { label: t("profile.biometricAuth"), icon: <Fingerprint size={18} />, toggle: true, path: "/settings/security/biometrics" },
      ],
    },
    {
      title: t("profile.preferences"),
      icon: <Bell size={12} />,
      items: [
        { label: t("profile.notifications"), icon: <Bell size={18} />, path: "/notifications" },
        { label: t("profile.accountSecurity"), icon: <Lock size={18} />, path: "/settings/security" },
        { label: t("profile.displayCurrency"), icon: <CreditCard size={18} />, value: `${currencyInfo.code} (${currencyInfo.symbol})`, fieldKey: "currency", editable: true, inputType: "currency" as const },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="text-blue-500 animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* Ecran de deconnexion (localise) */}
      {loggingOut && <LogoutOverlay />}

      {/* Programme de parrainage */}
      {showReferral && <ReferralProgram onClose={() => setShowReferral(false)} />}

      {/* QR de paiement (cash-in / cash-out agent) */}
      {showPaymentQR && user && (
        <PaymentQRModal
          user={{
            id: user.id,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            phone: user.phone,
            email: user.email,
            role: user.agentRole || user.role,
            agentId: user.agentId,
          }}
          onClose={() => setShowPaymentQR(false)}
        />
      )}

      {/* En-tête du profil — version historique */}
      <div className="relative bg-gradient-to-b from-blue-600/20 to-transparent px-6 pb-8 pt-12">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-1 shadow-2xl">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#020617] text-3xl font-black italic">
                {user?.avatar ? <img src={user.avatar} alt="Photo de profil" className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase() || "P"}
              </div>
            </div>
            <Link href="/profile/edit" aria-label={t("profile.editMyInfo")} className="absolute -bottom-1 -right-1 rounded-full border-4 border-[#020617] bg-blue-600 p-2 shadow-lg transition-transform active:scale-90"><UserPen size={14} className="text-white" /></Link>
          </div>
          <h1 className="mt-4 flex items-center gap-2 text-center text-lg font-bold text-balance">{user?.name}{user?.isVerified && <CheckCircle2 size={16} fill="#60a5fa" className="shrink-0 rounded-full border-none bg-white text-[#020617]" />}</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{user?.role === "ADMIN" ? t("profile.administrator") : `${t("profile.pioneerSince")} ${user?.joinedAt}`}</p>
          <Link href="/profile/edit" className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2 text-xs font-bold transition-all hover:bg-white/10 active:scale-95"><UserPen size={14} className="text-blue-400" />{t("profile.editMyInfo")}</Link>
        </div>
      </div>

      {/* Statistiques rapides — KYC, reseau, compte, parrainage sur une seule ligne */}
      <div className="grid grid-cols-4 gap-2 px-6 mb-8">
        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center min-w-0">
          <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mb-1 truncate">{t("profile.kycStatus")}</p>
          <p className={`text-[11px] font-bold truncate ${user?.isVerified ? "text-emerald-400" : "text-amber-400"}`}>
            {user?.isVerified ? t("profile.verified") : user?.kycStatus || t("profile.notVerified")}
          </p>
        </div>
        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center min-w-0">
          <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mb-1 truncate">{t("profile.network")}</p>
          <p className="text-[11px] font-bold text-white truncate">
            Pi {piNetwork === "mainnet" ? "Mainnet" : "Testnet"}
          </p>
        </div>
        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center min-w-0">
          <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mb-1 truncate">{t("profile.account")}</p>
          <p className="text-[11px] font-bold text-blue-400 truncate">
            {user?.role === "ADMIN" ? t("profile.admin") : t("profile.standard")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowReferral(true)}
          className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-all active:scale-95 min-w-0"
        >
          <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mb-1 truncate">{t("profile.referral")}</p>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
            <Gift size={13} />
          </span>
        </button>
      </div>
      {/* QR de paiement - cash-in / cash-out via agent */}
      <div className="px-6 mb-8">
        <button
          type="button"
          onClick={() => setShowPaymentQR(true)}
          className="w-full flex items-center gap-4 p-4 rounded-[28px] bg-gradient-to-r from-blue-600/20 to-emerald-600/10 border border-white/10 hover:border-white/20 transition-all active:scale-[0.99] text-left"
        >
          <div className="p-3 rounded-2xl bg-white text-[#020617] shrink-0">
            <QrCode size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{t("profile.paymentQrTitle")}</p>
            <p className="text-[11px] text-slate-400 font-medium leading-snug mt-0.5 text-pretty">
              {t("profile.paymentQrDesc")}
            </p>
          </div>
          <ChevronRight size={18} className="text-slate-500 shrink-0" />
        </button>
      </div>

      {/* Bouton modifier mes informations */}
      <div className="px-6 mb-8 flex justify-center">
        <Link
          href="/profile/edit"
          className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 transition-all active:scale-95"
        >
          <UserPen size={14} className="text-blue-400" />
          {t("profile.editMyInfo")}
        </Link>
      </div>

      {/* Sections du profil */}
      <div className="px-6 space-y-8">
        {profileSections.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] mb-4 ml-2 flex items-center gap-2">
              {section.icon}
              {section.title}
            </h3>
            <div className="bg-white/5 rounded-[28px] border border-white/10 overflow-hidden">
              {section.items.map((item, iIdx) => {
                const isEditing = editingField === item.fieldKey;
                const rawValue = item.fieldKey ? (user as unknown as Record<string, string | undefined>)?.[item.fieldKey] || "" : "";
                
                return (
                  <div
                    key={iIdx}
                    onClick={() => item.path && !item.toggle && !item.editable && router.push(item.path)}
                    className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none ${item.path && !item.toggle && !item.editable ? "cursor-pointer" : ""}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-900 text-blue-400 shrink-0">{item.icon}</div>
                      <span className="font-semibold text-sm text-slate-300 shrink-0">{item.label}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                      {isEditing ? (
                        // Mode edition
                        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                          {item.inputType === "select" && item.options ? (
                            <div className="relative flex-1">
                              <select
                                ref={selectRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-slate-800 border border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none appearance-none cursor-pointer pr-8"
                              >
                                <option value="" className="bg-slate-900">{t("profile.select")}</option>
                                {item.options.map((opt) => (
                                  <option key={opt.value} value={opt.value} className="bg-slate-900">
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          ) : (
                            <input
                              ref={inputRef}
                              type={item.inputType || "text"}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              className={`flex-1 bg-slate-800 border border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none ${item.inputType === "date" ? "[color-scheme:dark]" : ""}`}
                              placeholder={item.label}
                            />
                          )}
                          <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="p-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
                          >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : item.inputType === "currency" ? (
                        // Sélecteur de devise
                        <div className="relative" ref={currencySelectorRef}>
                          <button
                            onClick={() => setShowCurrencySelector(!showCurrencySelector)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-colors"
                          >
                            <span className="text-lg">{currencyInfo.flag}</span>
                            <span className="text-[11px] font-bold text-blue-400">{currencyInfo.code}</span>
                            <span className="text-[10px] text-slate-500">({currencyInfo.symbol})</span>
                            <ChevronDown size={12} className={`text-slate-400 transition-transform ${showCurrencySelector ? "rotate-180" : ""}`} />
                          </button>
                          
                          {showCurrencySelector && (
                            <div className="fixed inset-0 z-[100]" onClick={() => setShowCurrencySelector(false)}>
                              <div 
                                className="absolute left-4 right-4 bottom-24 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-3 border-b border-slate-800">
                                  <p className="text-xs text-slate-400 font-bold">{t("profile.chooseCurrency")}</p>
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                                    const info = CURRENCIES[code];
                                    const isSelected = code === currency;
                                    return (
                                      <button
                                        key={code}
                                        onClick={() => {
                                          setCurrency(code);
                                          setShowCurrencySelector(false);
                                          toast.success(`${t("profile.currencyChanged")} ${info.name}`);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800 transition-colors ${isSelected ? "bg-blue-600/20 border-l-2 border-blue-500" : ""}`}
                                      >
                                        <span className="text-2xl">{info.flag}</span>
                                        <div className="flex-1 text-left">
                                          <p className={`text-sm font-semibold ${isSelected ? "text-blue-400" : "text-white"}`}>
                                            {info.code}
                                          </p>
                                          <p className="text-xs text-slate-500">{info.name}</p>
                                        </div>
                                        <span className="text-sm text-slate-500">{info.symbol}</span>
                                        {isSelected && (
                                          <CheckCircle2 size={18} className="text-blue-400" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Mode affichage normal
                        <>
                          {item.value && (
                            <span className={`text-[11px] font-bold max-w-[140px] truncate ${item.accent || (item.active ? "text-emerald-400" : "text-slate-500")}`}>
                              {item.value}
                            </span>
                          )}
                          {item.toggle ? (
                            <button
                              onClick={() => item.path && router.push(item.path)}
                              className="w-10 h-5 bg-blue-600 rounded-full relative"
                            >
                              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                            </button>
                          ) : item.editable && !item.readOnly ? (
                            <button
                              onClick={() => handleStartEdit(item.fieldKey!, rawValue, item.inputType)}
                              className="p-1.5 rounded-lg transition-colors active:scale-90"
                              title="Modifier"
                            >
                              {/* Icone supprimee - zone cliquable conservee */}
                            </button>
                          ) : item.path ? (
                            <button
                              onClick={() => router.push(item.path!)}
                              className="p-1.5"
                            >
                              <ChevronRight size={16} className="text-slate-700" />
                            </button>
                          ) : (
                            <ChevronRight size={16} className="text-slate-700" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Bouton deconnexion */}
        <button
          onClick={() => {
            if (loggingOut) return;
            setLoggingOut(true);
            void performClientLogout();
          }}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-3 p-5 rounded-[28px] bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-all mb-8 active:scale-95 disabled:opacity-60"
        >
          <LogOut size={20} />
          {t("profile.secureLogout")}
        </button>

        <DeleteAccountControl />

        <div className="flex items-center justify-center gap-2 text-sm font-bold text-blue-400 mb-6">
          <Link href="/legal/terms" className="hover:text-blue-300 transition-colors">
            {t("profile.termsLink")}
          </Link>
          <span className="text-slate-600">·</span>
          <Link href="/legal/privacy" className="hover:text-blue-300 transition-colors">
            {t("profile.privacyLink")}
          </Link>
        </div>

        <p className="text-center text-xs text-slate-600 font-medium leading-relaxed text-pretty pb-4">
          {t("profile.copyright").replace("{year}", String(new Date().getFullYear()))}
        </p>
      </div>
    </div>
  );
}
