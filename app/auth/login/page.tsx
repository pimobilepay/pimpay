"use client";                                  
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldCheck, Lock, Mail, Loader2, CheckCircle2, Building2, Landmark, User } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
// On utilise le HOOK direct
import { usePiAuth } from "@/hooks/usePiAuth"; 
import MFASelector from "@/components/auth/MFASelector";
import AccountStatusModal from "@/components/AccountStatusModal";
import { useLanguage } from "@/context/LanguageContext";
import ChatBubble from "@/components/ChatBubble";

type LoginType = "user" | "bank" | "business";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [tempRole, setTempRole] = useState<string | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [needsPinUpdate, setNeedsPinUpdate] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginType, setLoginType] = useState<LoginType>("user");
  
  // Account status modal states
  const [showAccountStatusModal, setShowAccountStatusModal] = useState(false);
  const [accountStatusData, setAccountStatusData] = useState<{
    status: "SUSPENDED" | "MAINTENANCE" | "FROZEN" | "BANNED";
    reason?: string;
    maintenanceUntil?: string;
  } | null>(null);

  const { loginWithPi, loading: piLoading } = usePiAuth();
  const { t } = useLanguage();

  const [showTransition, setShowTransition] = useState(false);
  const [transitionStep, setTransitionStep] = useState("init");
  const [dynamicMessage, setDynamicMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fonction helper pour determiner la destination selon le role
  const getRedirectPath = (role: string) => {
    switch (role) {
      case "ADMIN": return "/admin";
      case "BANK_ADMIN": return "/bank";
      case "BUSINESS_ADMIN": return "/business";
      case "AGENT": return "/hub";
      default: return "/dashboard";
    }
  };

  const triggerSuccessTransition = (targetPath: string) => {
    setShowTransition(true);
    setDynamicMessage(t("auth.login.init"));
    setTimeout(() => setDynamicMessage(t("auth.login.securing")), 1000);
    setTimeout(() => setDynamicMessage(t("auth.login.syncing")), 2000);
    setTimeout(() => {
      setTransitionStep("success");
      setTimeout(() => {
        window.location.replace(targetPath);
      }, 1000);
    }, 3000);
  };

  // Login Classique (Email/Password)
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, loginType }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Verifier si c'est une erreur de compte suspendu/maintenance
        if (data?.accountStatus && ["SUSPENDED", "MAINTENANCE", "FROZEN", "BANNED"].includes(data.accountStatus)) {
          setAccountStatusData({
            status: data.accountStatus,
            reason: data.reason,
            maintenanceUntil: data.maintenanceUntil
          });
          setShowAccountStatusModal(true);
          setLoading(false);
          return;
        }
        toast.error(data?.error ?? t("auth.login.invalidCredentials"));
        setLoading(false);
        return;
      }

      if (data.requireMFA || data.requirePin) {
        console.log("[v0] MFA Required - Opening MFASelector modal", {
          requireMFA: data.requireMFA,
          requirePin: data.requirePin,
          needsPinUpdate: data.needsPinUpdate,
          twoFactorEnabled: data.twoFactorEnabled,
          userId: data.userId
        });
        setTempUserId(data.userId);
        setTempRole(data.role);
        setTempToken(data.tempToken || null);
        setUserEmail(data.email || email);
        setNeedsPinUpdate(data.needsPinUpdate || false);
        setTwoFactorEnabled(data.twoFactorEnabled || false);
        setShowMFAModal(true);
        setLoading(false);
      } else if (data?.user) {
        localStorage.setItem("pimpay_user", JSON.stringify(data.user));
        triggerSuccessTransition(getRedirectPath(data.user.role));
      }
    } catch (error) {
      toast.error(t("auth.login.serverError"));
      setLoading(false);
    }
  };

  // Login Pi Browser utilisant le Hook stable
  const handlePiBrowserLogin = async () => {
    try {
      // Verifier si on est dans Pi Browser
      if (typeof window !== "undefined" && !window.Pi) {
        toast.error("Veuillez ouvrir cette page dans le Pi Browser", { duration: 5000 });
        return;
      }

      // Le hook gere l'attente du SDK et son initialisation
      const result = await loginWithPi();
      
      if (result && result.success) {
        localStorage.setItem("pimpay_user", JSON.stringify(result.user));
        triggerSuccessTransition(getRedirectPath(result.user?.role || "USER"));
      } else if (result && !result.success) {
        // L'erreur est deja affichee par le hook via toast
        console.log("[v0] Pi login failed:", result.error);
      }
    } catch (error: any) {
      console.error("[v0] Pi login exception:", error);
      toast.error(t("auth.login.piError"));
    }
  };

  // Configuration des types de login
  const loginTypes = [
    { id: "user" as LoginType, label: "Utilisateur", icon: User, color: "blue" },
    { id: "bank" as LoginType, label: "Banque", icon: Landmark, color: "emerald" },
    { id: "business" as LoginType, label: "Business", icon: Building2, color: "amber" },
  ];

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center p-4 overflow-hidden font-sans">
      
      <MFASelector
        isOpen={showMFAModal}
        onClose={() => setShowMFAModal(false)}
        onSuccess={() => {
          const destination = getRedirectPath(tempRole || "USER");
          triggerSuccessTransition(destination);
        }}
        userId={tempUserId || ""}
        tempToken={tempToken || undefined}
        userEmail={userEmail || undefined}
        needsPinUpdate={needsPinUpdate}
        twoFactorEnabled={twoFactorEnabled}
      />

      {/* Modal pour compte suspendu/maintenance */}
      {accountStatusData && (
        <AccountStatusModal
          isOpen={showAccountStatusModal}
          onClose={() => {
            setShowAccountStatusModal(false);
            setAccountStatusData(null);
          }}
          status={accountStatusData.status}
          reason={accountStatusData.reason}
          maintenanceUntil={accountStatusData.maintenanceUntil}
        />
      )}

      {showTransition && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#020617]">
          <div className={`flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-tr transition-all duration-700 ${
            transitionStep === "success" ? "from-green-500 to-emerald-700 shadow-green-500/50" : "from-blue-600 to-blue-800 shadow-blue-500/50"
          }`}>
            {transitionStep === "success" ? <CheckCircle2 className="w-12 h-12 text-white" /> : <ShieldCheck className="w-12 h-12 text-white animate-pulse" />}
          </div>
          <h2 className="mt-6 text-white text-xl font-bold tracking-tighter uppercase">
            PIMPAY<span className={transitionStep === "success" ? "text-green-500" : "text-blue-500"}>.</span>
          </h2>
          <p className="mt-2 text-[10px] text-slate-500 uppercase tracking-widest">{dynamicMessage}...</p>
        </div>
      )}

      <Card className="relative z-10 w-full max-w-[420px] p-6 sm:p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 shadow-2xl rounded-[32px]">
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 transition-all duration-300 ${
            loginType === "bank" 
              ? "bg-emerald-600/10 border border-emerald-500/20" 
              : loginType === "business" 
                ? "bg-amber-600/10 border border-amber-500/20"
                : "bg-blue-600/10 border border-blue-500/20"
          }`}>
            {loginType === "bank" ? (
              <Landmark className="w-10 h-10 text-emerald-500" />
            ) : loginType === "business" ? (
              <Building2 className="w-10 h-10 text-amber-500" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-blue-500" />
            )}
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter mb-1">
            PIMPAY
            <span className={`not-italic ${
              loginType === "bank" ? "text-emerald-500" : loginType === "business" ? "text-amber-500" : "text-blue-500"
            }`}>.</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            {loginType === "bank" 
              ? "Portail Banque Centrale" 
              : loginType === "business" 
                ? "Espace Entreprise" 
                : t("auth.login.subtitle")}
          </p>
        </div>

        {/* Selecteur de type de connexion */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-950/50 rounded-2xl">
          {loginTypes.map((type) => {
            const Icon = type.icon;
            const isActive = loginType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setLoginType(type.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                  isActive
                    ? type.color === "emerald"
                      ? "bg-emerald-600 text-white"
                      : type.color === "amber"
                        ? "bg-amber-600 text-white"
                        : "bg-blue-600 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{type.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-400 ml-1 text-[10px] font-black uppercase tracking-widest">
              {loginType === "bank" 
                ? "Identifiant Institutionnel" 
                : loginType === "business" 
                  ? "Email Professionnel" 
                  : t("auth.login.identifier")}
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
              <input
                type="text" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  loginType === "bank" 
                    ? "admin@banque-centrale.cg" 
                    : loginType === "business" 
                      ? "contact@entreprise.cg" 
                      : t("auth.login.identifierPlaceholder")
                }
                className={`w-full h-14 pl-12 bg-slate-950/50 border border-white/5 text-white rounded-2xl transition-all outline-none text-sm ${
                  loginType === "bank" 
                    ? "focus:border-emerald-500/50" 
                    : loginType === "business" 
                      ? "focus:border-amber-500/50"
                      : "focus:border-blue-500/50"
                }`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-slate-400 ml-1 text-[10px] font-black uppercase tracking-widest">{t("auth.login.password")}</Label>
              <Link href="/auth/forgot-password" className="text-blue-500 text-[9px] font-bold uppercase tracking-widest">{t("auth.login.forgot")}</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full h-14 pl-12 pr-12 bg-slate-950/50 border border-white/5 text-white rounded-2xl transition-all outline-none ${
                  loginType === "bank" 
                    ? "focus:border-emerald-500/50" 
                    : loginType === "business" 
                      ? "focus:border-amber-500/50"
                      : "focus:border-blue-500/50"
                }`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading || piLoading} 
            className={`w-full h-14 text-white rounded-2xl font-bold active:scale-[0.98] transition-all ${
              loginType === "bank" 
                ? "bg-emerald-600 hover:bg-emerald-500" 
                : loginType === "business" 
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("auth.login.loginButton")}
          </Button>
        </form>

        {/* Pi Browser Login - uniquement pour les utilisateurs standard */}
        {loginType === "user" && (
          <>
            <div className="flex items-center gap-4 my-6">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t("common.or")}</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <Button
              onClick={handlePiBrowserLogin}
              disabled={loading || piLoading}
              type="button"
              className="w-full h-14 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl font-bold transition-all flex items-center justify-center gap-3"
            >
              {piLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">π</span>
                  </div>
                  <span className="text-sm uppercase tracking-tight">Pi Browser Login</span>
                </>
              )}
            </Button>
          </>
        )}

        {/* Info pour les connexions institutionnelles */}
        {loginType !== "user" && (
          <div className={`mt-6 p-4 rounded-2xl border ${
            loginType === "bank" 
              ? "bg-emerald-500/5 border-emerald-500/20" 
              : "bg-amber-500/5 border-amber-500/20"
          }`}>
            <p className={`text-xs ${loginType === "bank" ? "text-emerald-400" : "text-amber-400"}`}>
              {loginType === "bank" 
                ? "Acces reserve aux administrateurs de la Banque Centrale. Contactez le support pour obtenir vos identifiants."
                : "Espace dedie aux entreprises partenaires PIMPAY. Inscrivez votre entreprise pour obtenir un acces."}
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          {loginType === "user" ? (
            <p className="text-[11px] text-slate-500 font-medium">
              {t("auth.login.noAccount")}
              <Link href="/auth/signup" className="ml-2 text-blue-500 font-bold uppercase tracking-widest hover:underline">
                {t("auth.login.joinPimpay")}
              </Link>
            </p>
          ) : loginType === "business" ? (
            <p className="text-[11px] text-slate-500 font-medium">
              Nouvelle entreprise?
              <Link href="/auth/business-signup" className="ml-2 text-amber-500 font-bold uppercase tracking-widest hover:underline">
                Inscrivez votre business
              </Link>
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 font-medium">
              Besoin d'assistance?
              <Link href="/support" className="ml-2 text-emerald-500 font-bold uppercase tracking-widest hover:underline">
                Contactez le support
              </Link>
            </p>
          )}
        </div>
      </Card>

      <ChatBubble className="bottom-6" />
    </div>
  );
}
