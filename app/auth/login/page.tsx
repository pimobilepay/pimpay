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
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import MFASelector from "@/components/auth/MFASelector";
import LanguageOnboarding, { LANGUAGE_ONBOARDED_KEY } from "@/components/auth/LanguageOnboarding";
import ForcePasswordChange from "@/components/auth/ForcePasswordChange";
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
  const { loginWithGoogle, loading: googleLoading } = useGoogleAuth();
  const { t } = useLanguage();

  const [showTransition, setShowTransition] = useState(false);
  const [transitionStep, setTransitionStep] = useState("init");
  const [dynamicMessage, setDynamicMessage] = useState("");

  // Language onboarding (first login only)
  const [showLanguageOnboarding, setShowLanguageOnboarding] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  // Forced password change (after lockout limit reached or admin unlock)
  const [showForcePasswordChange, setShowForcePasswordChange] = useState(false);

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

  // Etape langue : a la premiere connexion, proposer le choix de la langue,
  // sinon rediriger directement.
  const proceedToLanguageOrRedirect = (targetPath: string) => {
    let alreadyOnboarded = false;
    try {
      alreadyOnboarded = localStorage.getItem(LANGUAGE_ONBOARDED_KEY) === "1";
    } catch {
      alreadyOnboarded = false;
    }

    if (!alreadyOnboarded) {
      setPendingRedirect(targetPath);
      setShowLanguageOnboarding(true);
      return;
    }

    triggerSuccessTransition(targetPath);
  };

  // Apres une authentification reussie, enchainement :
  //   1. Si mustChangePassword (limite de tentatives atteinte ou deblocage admin)
  //      -> on force le changement de mot de passe.
  //   2. Sinon, choix de la langue a la premiere connexion.
  //   3. Puis redirection vers l'espace correspondant au role.
  const handlePostLogin = (role: string, mustChangePassword?: boolean) => {
    const targetPath = getRedirectPath(role);
    setPendingRedirect(targetPath);

    if (mustChangePassword) {
      setShowForcePasswordChange(true);
      return;
    }

    proceedToLanguageOrRedirect(targetPath);
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
        // Compte bloque suite a trop de tentatives (10) -> 423
        if (data?.accountStatus === "LOCKED") {
          toast.error(data?.error ?? "Compte bloque pendant 48 heures.", {
            duration: 10000,
            style: {
              background: "rgba(220, 38, 38, 0.95)",
              border: "1px solid rgba(248, 113, 113, 0.4)",
              color: "#fff",
            },
          });
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
        handlePostLogin(data.user.role, data.mustChangePassword);
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
        handlePostLogin(result.user?.role || "USER", (result as any).mustChangePassword);
      } else if (result && !result.success) {
        // L'erreur est deja affichee par le hook via toast
        console.log("[v0] Pi login failed:", result.error);
      }
    } catch (error: any) {
      console.error("[v0] Pi login exception:", error);
      toast.error(t("auth.login.piError"));
    }
  };

  // Login Google (OAuth popup) - meme flux que Pi Browser Login
  const handleGoogleLogin = async () => {
    try {
      const result = await loginWithGoogle();

      if (result && result.success) {
        localStorage.setItem("pimpay_user", JSON.stringify(result.user));
        handlePostLogin(result.user?.role || "USER", (result as any).mustChangePassword);
      } else if (result && !result.success) {
        console.log("[v0] Google login failed:", result.error);
      }
    } catch (error: any) {
      console.error("[v0] Google login exception:", error);
      toast.error(t("auth.login.serverError"));
    }
  };

  // Configuration des types de login
  const loginTypes = [    { id: "user" as LoginType, label: "Utilisateur", icon: User, color: "blue" },
    { id: "bank" as LoginType, label: "Banque", icon: Landmark, color: "emerald" },
    { id: "business" as LoginType, label: "Business", icon: Building2, color: "amber" },
  ];

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center overflow-y-auto overflow-x-hidden px-4 py-4 sm:py-8 font-sans">
      
      <MFASelector
        isOpen={showMFAModal}
        onClose={() => setShowMFAModal(false)}
        onSuccess={(payload) => {
          handlePostLogin(tempRole || "USER", payload?.mustChangePassword);
        }}
        userId={tempUserId || ""}
        tempToken={tempToken || undefined}
        userEmail={userEmail || undefined}
        needsPinUpdate={needsPinUpdate}
        twoFactorEnabled={twoFactorEnabled}
      />

      {/* Changement de mot de passe force (limite de tentatives atteinte ou deblocage admin) */}
      <ForcePasswordChange
        isOpen={showForcePasswordChange}
        onComplete={() => {
          setShowForcePasswordChange(false);
          proceedToLanguageOrRedirect(pendingRedirect || getRedirectPath(tempRole || "USER"));
        }}
      />

      {/* Choix de la langue a la premiere connexion */}
      <LanguageOnboarding
        isOpen={showLanguageOnboarding}
        onComplete={() => {
          setShowLanguageOnboarding(false);
          triggerSuccessTransition(pendingRedirect || "/dashboard");
        }}
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
          onMaintenanceEnd={() => {
            setShowAccountStatusModal(false);
            setAccountStatusData(null);
            toast.success("La maintenance est terminee. Vous pouvez maintenant vous connecter.");
          }}
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
            PIMOBIPAY<span className={transitionStep === "success" ? "text-green-500" : "text-blue-500"}>.</span>
          </h2>
          <p className="mt-2 text-[10px] text-slate-500 uppercase tracking-widest">{dynamicMessage}...</p>
        </div>
      )}

      <Card className="relative z-10 w-full max-w-[420px] p-6 sm:p-8 bg-slate-900/40 backdrop-blur-3xl border-white/10 shadow-2xl rounded-[32px]">
        <div className="text-center mb-5">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-all duration-300 ${
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
            PIMOBIPAY
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
        <div className="flex gap-2 mb-5 p-1 bg-slate-950/50 rounded-2xl">
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
              <Link href="/auth/forgot-password" size="sm" className="text-blue-500 text-[9px] font-bold uppercase tracking-widest">{t("auth.login.forgot")}</Link>
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
            disabled={loading || piLoading || googleLoading} 
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
              disabled={loading || piLoading || googleLoading}
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

            <Button
              onClick={handleGoogleLogin}
              disabled={loading || piLoading || googleLoading}
              type="button"
              className="w-full h-14 mt-3 bg-white hover:bg-slate-100 border border-white/10 text-slate-800 rounded-2xl font-bold transition-all flex items-center justify-center gap-3"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                    />
                  </svg>
                  <span className="text-sm uppercase tracking-tight">Google Login</span>
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
                : "Espace dedie aux entreprises partenaires PIMOBIPAY. Inscrivez votre entreprise pour obtenir un acces."}
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
