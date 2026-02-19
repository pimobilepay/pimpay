"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, ShieldCheck, Loader2, 
  LockKeyhole, CheckCircle2 
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get("username") || "";
  const { t } = useLanguage();

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;

    setIsVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code }),
      });

      const result = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        toast.success(t("extra.identityConfirmed"));
        // Redirection vers la réinitialisation du mot de passe après 2 secondes
        setTimeout(() => {
          router.push(`/auth/reset-password?username=${username}&token=${code}`);
        }, 2000);
      } else {
        toast.error(result.error || t("extra.invalidOrExpired"));
      }
    } catch (error) {
      toast.error(t("extra.gcvServerError"));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col px-8 py-12">
      <button 
        onClick={() => router.back()}
        className="w-fit p-3 bg-white/5 border border-white/10 rounded-2xl mb-10"
      >
        <ArrowLeft size={22} className="text-slate-400" />
      </button>

      <div className="flex-1 flex flex-col">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
            <LockKeyhole size={32} className="text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">{t("extra.verification")}</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-2">
            {t("extra.enterCodeSent")} @{username}
          </p>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleVerify} className="space-y-8">
            <div className="space-y-4">
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                className="w-full bg-slate-900/50 border border-white/10 rounded-[2rem] py-6 text-center text-3xl font-black tracking-[0.5em] focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-800"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
              />
              <p className="text-[11px] text-center text-slate-500 italic">
                {t("extra.codeIs6Digits")}
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying || code.length < 6}
              className="w-full flex items-center justify-center gap-3 p-6 bg-emerald-600 rounded-[2rem] text-[12px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-30"
            >
              {isVerifying ? <Loader2 className="animate-spin" size={20} /> : t("extra.validateCryptogram")}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
            <CheckCircle2 size={64} className="text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-400 text-sm">Accès autorisé. Redirection...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant principal avec Suspense pour Next.js 13+ (obligatoire pour useSearchParams)
export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
