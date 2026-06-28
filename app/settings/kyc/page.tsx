"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, ShieldCheck, Camera, FileText,
  User, CheckCircle2, Loader2,
  Upload, Smartphone, ChevronDown, Calendar,
  MapPin, Hash, Globe, Fingerprint, X, CreditCard, ArrowRight,
  Briefcase, AlertTriangle, Shield,
  RefreshCw, Scan, Lock, BadgeCheck, Clock, Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SideMenu from "@/components/SideMenu";
import countries from "world-countries";
import { useLanguage } from "@/context/LanguageContext";

export default function KYCPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<string>("NONE");

  // Selfie states
  const [cameraReady, setCameraReady] = useState(false);
  const [selfieCountdown, setSelfieCountdown] = useState<number | null>(null);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fraud result from server
  const [fraudResult, setFraudResult] = useState<{
    score: number;
    riskLevel: string;
    flags: string[];
  } | null>(null);

  // Terms
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [formData, setFormData] = useState({
    idType: "", idCountry: "", idNumber: "", idExpiryDate: "",
    firstName: "", lastName: "", birthDate: "", gender: "",
    nationality: "", occupation: "", phone: "", address: "", city: "",
    provinceState: "", sourceOfFunds: "",
    kycFrontUrl: "", kycBackUrl: "", kycSelfieUrl: ""
  });

  // ---- Step labels ----
  const STEPS = [
    { id: 1, label: t("kyc.steps.document"), icon: CreditCard },
    { id: 2, label: t("kyc.steps.identity"), icon: User },
    { id: 3, label: t("kyc.steps.address"), icon: MapPin },
    { id: 4, label: t("kyc.steps.photos"), icon: FileText },
    { id: 5, label: t("kyc.steps.selfie"), icon: Camera },
    { id: 6, label: t("kyc.steps.review"), icon: Shield },
  ];

  useEffect(() => {
    setMounted(true);
    fetchUserSession();
  }, []);

  async function fetchUserSession() {
    try {
      const res = await fetch("/api/user/profile", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const u = data.user || data;
        setUserId(u.id);
        setKycStatus(u.kycStatus || "NONE");
        // Pre-fill from existing profile
        setFormData(prev => ({
          ...prev,
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          phone: u.phone || "",
          nationality: u.nationality || "",
          address: u.address || "",
          city: u.city || "",
          provinceState: u.provinceState || "",
          occupation: u.occupation || "",
          gender: u.gender || "",
        }));
      } else if (res.status === 401) {
        router.push("/auth/login");
      }
    } catch (err) {
      console.error("Session Error:", err);
    } finally {
      setIsLoadingSession(false);
    }
  }

  const updateField = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const countryList = countries.map(c => ({
    name: c.name.common,
    flag: c.flag
  })).sort((a, b) => a.name.localeCompare(b.name));

  // Permanent ID cards (e.g. Chinese national ID) never expire
  const isPermanentDoc = formData.idExpiryDate === "PERMANENT";

  // ---- Camera for selfie ----
  const startCamera = useCallback(async () => {
    try {
      setCameraReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch {
      toast.error(t("kyc.cameraNotFound"));
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (step === 5 && mounted && !selfieCaptured) {
      startCamera();
    }
    return () => {
      if (step !== 5) stopCamera();
    };
  }, [step, mounted, selfieCaptured, startCamera, stopCamera]);

  const startSelfieCountdown = () => {
    setSelfieCountdown(3);
    const interval = setInterval(() => {
      setSelfieCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          captureSelfie();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const captureSelfie = async () => {
    if (!videoRef.current || !userId) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0);

      // Show preview
      const previewUrl = canvas.toDataURL("image/jpeg", 0.9);
      setSelfiePreview(previewUrl);
      setSelfieCaptured(true);
      stopCamera();

      // Upload
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      );
      if (blob) {
        setIsUploading(true);
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        await handleUploadDirect(file, "kycSelfieUrl");
        setIsUploading(false);
      }
    }
  };

  const retakeSelfie = () => {
    setSelfieCaptured(false);
    setSelfiePreview(null);
    updateField("kycSelfieUrl", "");
    startCamera();
  };

  const handleUploadDirect = async (file: File, field: string) => {
    if (!userId) return;
    const data = new FormData();
    data.append("file", file);
    data.append("userId", userId);
    data.append("type", field);

    try {
      const res = await fetch("/api/kyc/upload", { method: "POST", body: data });
      const result = await res.json();
      if (result.url) {
        updateField(field, result.url);
        toast.success(
          field === "kycSelfieUrl" ? t("kyc.selfieSaved") :
          field === "kycFrontUrl" ? t("kyc.frontSaved") : t("kyc.backSaved")
        );
      } else {
        toast.error(result.error || t("kyc.uploadError"));
      }
    } catch {
      toast.error(t("kyc.networkUploadError"));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!userId) { toast.error(t("kyc.sessionExpired")); return; }
    if (!file) return;
    setIsUploading(true);
    await handleUploadDirect(file, field);
    setIsUploading(false);
  };

  const finishKYC = async () => {
    if (!userId) return;
    if (!formData.kycSelfieUrl) { toast.error(t("kyc.selfieRequired")); return; }
    if (!acceptedTerms) { toast.error(t("kyc.acceptTermsRequired")); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, userId })
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setFraudResult(result.fraudCheck);
        toast.success(t("kyc.kycSubmitted"));
        setTimeout(() => router.push("/dashboard"), 2500);
      } else if (res.status === 403) {
        setFraudResult({
          score: result.fraudScore,
          riskLevel: result.riskLevel,
          flags: [],
        });
        toast.error(result.error || t("kyc.submissionRejected"));
      } else {
        toast.error(result.error || t("kyc.submissionError"));
      }
    } catch {
      toast.error(t("kyc.networkError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Step validation ----
  const canProceed = (s: number): boolean => {
    switch (s) {
      case 1: return !!(formData.idType && formData.idCountry && formData.idNumber && formData.idExpiryDate);
      case 2: return !!(formData.firstName && formData.lastName && formData.birthDate && formData.nationality && formData.gender);
      case 3: return !!(formData.phone && formData.address && formData.city);
      case 4: return !!(formData.kycFrontUrl && formData.kycBackUrl);
      case 5: return !!formData.kycSelfieUrl;
      case 6: return acceptedTerms;
      default: return false;
    }
  };

  if (!mounted || isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin mb-4 text-blue-500" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{t("kyc.loading")}</p>
      </div>
    );
  }

  // Already verified
  if (kycStatus === "VERIFIED" || kycStatus === "APPROVED") {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
          <BadgeCheck size={40} className="text-emerald-500" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">{t("kyc.verifiedTitle")}</h1>
        <p className="text-sm text-slate-400 mb-8">{t("kyc.verifiedMessage")}</p>
        <button onClick={() => router.push("/dashboard")} className="px-8 py-4 bg-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest text-white">
          {t("kyc.backToDashboard")}
        </button>
      </div>
    );
  }

  // Pending
  if (kycStatus === "PENDING") {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
          <Clock size={40} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">{t("kyc.pendingTitle")}</h1>
        <p className="text-sm text-slate-400 mb-8">{t("kyc.pendingMessage")}</p>
        <button onClick={() => router.push("/dashboard")} className="px-8 py-4 bg-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest text-white">
          {t("kyc.backToDashboard")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24 font-sans overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Header */}
      <header className="px-6 pt-10 pb-5 sticky top-0 bg-[#020617]/95 backdrop-blur-xl z-30 border-b border-white/5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-tight">
                KYC<span className="text-blue-500">PORT</span>
              </h1>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{t("kyc.pageSubtitle")}</p>
            </div>
          </div>
          <button onClick={() => router.back()} className="p-2.5 bg-white/5 rounded-xl border border-white/5 active:scale-95 transition-transform">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1.5 mb-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-full h-1 rounded-full transition-all duration-500 ${
                  isDone ? 'bg-blue-500' : isActive ? 'bg-blue-600' : 'bg-white/5'
                }`} />
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                  isDone ? 'bg-blue-500/20' : isActive ? 'bg-blue-600/20 ring-1 ring-blue-500/50' : 'bg-white/5'
                }`}>
                  {isDone ? (
                    <CheckCircle2 size={14} className="text-blue-500" />
                  ) : (
                    <Icon size={12} className={isActive ? 'text-blue-500' : 'text-slate-600'} />
                  )}
                </div>
                <span className={`text-[7px] font-bold uppercase tracking-wider ${
                  isActive ? 'text-blue-500' : isDone ? 'text-blue-500/60' : 'text-slate-600'
                }`}>{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-500">
          <span>{t("kyc.stepOf").replace("{current}", String(step)).replace("{total}", String(STEPS.length))}</span>
          <span className="text-blue-500">{Math.round((step / STEPS.length) * 100)}%</span>
        </div>
      </header>

      <main className="px-6 mt-6 space-y-6">
        {/* Compliance banner */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-600/5 border border-blue-600/10">
          <Lock size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-400 leading-relaxed">
            {t("kyc.complianceBanner").split("AML/KYC").map((part, i, arr) => 
              i < arr.length - 1 ? (
                <span key={i}>{part}<span className="text-blue-500 font-bold">AML/KYC</span></span>
              ) : (
                part.split("GDPR").map((p2, j, arr2) => 
                  j < arr2.length - 1 ? (
                    <span key={`${i}-${j}`}>{p2}<span className="text-blue-500 font-bold">GDPR</span></span>
                  ) : <span key={`${i}-${j}`}>{p2}</span>
                )
              )
            )}
          </p>
        </div>

        {/* Step title */}
        <h2 className="text-lg font-black uppercase tracking-tight">
          {step === 1 && t("kyc.stepTitles.documentType")}
          {step === 2 && t("kyc.stepTitles.civilInfo")}
          {step === 3 && t("kyc.stepTitles.addressContact")}
          {step === 4 && t("kyc.stepTitles.documentProof")}
          {step === 5 && t("kyc.stepTitles.facialVerification")}
          {step === 6 && t("kyc.stepTitles.reviewSubmit")}
        </h2>

        {/* ---- STEP 1: Document ---- */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
            <CustomSelect label={t("kyc.documentTypeLabel")} icon={<CreditCard size={16} />}
              options={[t("kyc.documentTypes.idCard"), t("kyc.documentTypes.passport"), t("kyc.documentTypes.voterCard"), t("kyc.documentTypes.driverLicense")]}
              value={formData.idType} onChange={(v) => updateField("idType", v)} placeholder={t("kyc.choose")} />
            <CustomSelect label={t("kyc.countryLabel")} icon={<Globe size={16} />}
              options={countryList.map(c => `${c.flag} ${c.name}`)}
              value={formData.idCountry} onChange={(v) => updateField("idCountry", v)} placeholder={t("kyc.choose")} />
            <InputField icon={<Fingerprint size={16} />} label={t("kyc.documentNumber")}
              placeholder={t("kyc.documentNumberPlaceholder")} value={formData.idNumber}
              onChange={(v) => updateField("idNumber", v)} />
            {/* Expiry date with permanent (no-expiry) option */}
            <div className="space-y-2.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("kyc.expiryDate")}</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"><Calendar size={16} /></div>
                <input
                  type="date"
                  disabled={isPermanentDoc}
                  value={isPermanentDoc ? "" : formData.idExpiryDate}
                  onChange={(e) => updateField("idExpiryDate", e.target.value)}
                  className="w-full h-13 bg-white/[0.03] rounded-xl border border-white/5 pl-12 pr-4 text-sm font-semibold text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>
              <button
                type="button"
                onClick={() => updateField("idExpiryDate", isPermanentDoc ? "" : "PERMANENT")}
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.03] border border-white/5 active:scale-[0.99] transition-all"
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                  isPermanentDoc ? 'bg-blue-600 border-blue-600' : 'border-white/20'
                }`}>
                  {isPermanentDoc && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-200">{t("kyc.permanentExpiry")}</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{t("kyc.permanentExpiryDesc")}</p>
                </div>
              </button>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {t("kyc.documentWarning").split("valide et non expire").map((part, i, arr) => 
                  i < arr.length - 1 ? (
                    <span key={i}>{part}<span className="text-amber-500 font-bold">{t("kyc.documentWarning").includes("valid and not expired") ? "valid and not expired" : "valide et non expire"}</span></span>
                  ) : <span key={i}>{part}</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* ---- STEP 2: Identity ---- */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField icon={<User size={16} />} label={t("kyc.firstName")} value={formData.firstName}
                onChange={(v) => updateField("firstName", v)} />
              <InputField icon={<User size={16} />} label={t("kyc.lastName")} value={formData.lastName}
                onChange={(v) => updateField("lastName", v)} />
            </div>
            <InputField icon={<Calendar size={16} />} label={t("kyc.birthDate")} type="date"
              value={formData.birthDate} onChange={(v) => updateField("birthDate", v)} />
            <CustomSelect label={t("kyc.gender")} icon={<User size={16} />}
              options={[t("kyc.genders.male"), t("kyc.genders.female")]}
              value={formData.gender} onChange={(v) => updateField("gender", v)} placeholder={t("kyc.choose")} />
            <CustomSelect label={t("kyc.nationality")} icon={<Globe size={16} />}
              options={countryList.map(c => c.name)}
              value={formData.nationality} onChange={(v) => updateField("nationality", v)} placeholder={t("kyc.choose")} />
            <InputField icon={<Briefcase size={16} />} label={t("kyc.occupation")}
              placeholder={t("kyc.occupationPlaceholder")}
              value={formData.occupation} onChange={(v) => updateField("occupation", v)} />
            <CustomSelect label={t("kyc.sourceOfFunds")} icon={<Shield size={16} />}
              options={[t("kyc.fundsOptions.salary"), t("kyc.fundsOptions.business"), t("kyc.fundsOptions.investments"), t("kyc.fundsOptions.savings"), t("kyc.fundsOptions.other")]}
              value={formData.sourceOfFunds} onChange={(v) => updateField("sourceOfFunds", v)} placeholder={t("kyc.choose")} />
          </div>
        )}

        {/* ---- STEP 3: Address ---- */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
            <InputField icon={<Smartphone size={16} />} label={t("kyc.phone")} type="tel"
              placeholder={t("kyc.phonePlaceholder")}
              value={formData.phone} onChange={(v) => updateField("phone", v)} />
            <InputField icon={<MapPin size={16} />} label={t("kyc.address")}
              placeholder={t("kyc.addressPlaceholder")}
              value={formData.address} onChange={(v) => updateField("address", v)} />
            <div className="grid grid-cols-2 gap-4">
              <InputField icon={<Hash size={16} />} label={t("kyc.city")}
                value={formData.city} onChange={(v) => updateField("city", v)} />
              <InputField icon={<Hash size={16} />} label={t("kyc.province")}
                value={formData.provinceState} onChange={(v) => updateField("provinceState", v)} />
            </div>
          </div>
        )}

        {/* ---- STEP 4: Documents ---- */}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <DocUploadCard
              label={t("kyc.frontDocument")}
              description={t("kyc.frontDescription")}
              isUploaded={!!formData.kycFrontUrl}
              isUploading={isUploading}
              onUpload={(e) => handleUpload(e, "kycFrontUrl")}
              uploadingText={t("kyc.uploadInProgress")}
              chooseFileText={t("kyc.chooseFile")}
            />
            <DocUploadCard
              label={t("kyc.backDocument")}
              description={t("kyc.backDescription")}
              isUploaded={!!formData.kycBackUrl}
              isUploading={isUploading}
              onUpload={(e) => handleUpload(e, "kycBackUrl")}
              uploadingText={t("kyc.uploadInProgress")}
              chooseFileText={t("kyc.chooseFile")}
            />

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-600/5 border border-blue-600/10">
              <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {t("kyc.documentPhotoInfo").split("entierement visible").map((part, i, arr) => 
                  i < arr.length - 1 ? (
                    <span key={i}>{part}<span className="text-blue-500 font-bold">{t("kyc.documentPhotoInfo").includes("fully visible") ? "fully visible" : "entierement visible"}</span></span>
                  ) : <span key={i}>{part}</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* ---- STEP 5: Selfie ---- */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="relative w-full max-w-[300px] mx-auto aspect-square">
              {/* Outer ring */}
              <div className={`absolute inset-0 rounded-full border-[3px] transition-all duration-700 ${
                formData.kycSelfieUrl ? 'border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.2)]' :
                cameraReady ? 'border-blue-500/50 animate-pulse' : 'border-white/10'
              }`} />

              {/* Camera viewport */}
              <div className="absolute inset-3 rounded-full overflow-hidden bg-slate-900 border border-white/5">
                {selfieCaptured && selfiePreview ? (
                  <img src={selfiePreview} alt="Selfie preview" className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full h-full object-cover scale-x-[-1]" />
                )}

                {/* Scan overlay */}
                {!selfieCaptured && cameraReady && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Scan size={120} className="text-blue-500/20 animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Countdown */}
                {selfieCountdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-6xl font-black text-white animate-ping">{selfieCountdown}</span>
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                formData.kycSelfieUrl ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' :
                isUploading ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                'bg-blue-600/20 text-blue-500 border border-blue-600/30'
              }`}>
                {formData.kycSelfieUrl ? t("kyc.selfieOk") : isUploading ? t("kyc.uploading") : cameraReady ? t("kyc.ready") : t("kyc.initializing")}
              </div>
            </div>

            <div className="text-center space-y-4 pt-4">
              <p className="text-xs text-slate-400">
                {selfieCaptured
                  ? t("kyc.selfieCaptured")
                  : t("kyc.selfieInstructions")
                }
              </p>

              <div className="flex gap-3 max-w-xs mx-auto">
                {!selfieCaptured ? (
                  <button
                    disabled={!cameraReady || selfieCountdown !== null}
                    onClick={startSelfieCountdown}
                    className="flex-1 py-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={16} />
                    {selfieCountdown !== null ? `${selfieCountdown}...` : t("kyc.capture")}
                  </button>
                ) : (
                  <>
                    <button onClick={retakeSelfie}
                      className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 active:scale-95 transition-all flex items-center justify-center gap-2">
                      <RefreshCw size={14} />
                      {t("kyc.retake")}
                    </button>
                    {formData.kycSelfieUrl && (
                      <button onClick={() => setStep(6)}
                        className="flex-1 py-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                        {t("kyc.continue")} <ArrowRight size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- STEP 6: Review & Submit ---- */}
        {step === 6 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            {/* Summary card */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">{t("kyc.summary")}</p>
              </div>
              <div className="divide-y divide-white/5">
                <ReviewRow label={t("kyc.fullName")} value={`${formData.firstName} ${formData.lastName}`} />
                <ReviewRow label={t("kyc.document")} value={`${formData.idType} - ${formData.idNumber}`} />
                <ReviewRow label={t("kyc.country")} value={formData.idCountry} />
                <ReviewRow label={t("kyc.expiryDate")} value={isPermanentDoc ? t("kyc.permanentExpiry") : formData.idExpiryDate} />
                <ReviewRow label={t("kyc.birthDate")} value={formData.birthDate} />
                <ReviewRow label={t("kyc.nationality")} value={formData.nationality} />
                <ReviewRow label={t("kyc.phone")} value={formData.phone} />
                <ReviewRow label={t("kyc.address")} value={`${formData.address}, ${formData.city}`} />
                <ReviewRow label={t("kyc.occupation")} value={formData.occupation} />
                <ReviewRow label={t("kyc.sourceOfFunds")} value={formData.sourceOfFunds} />
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t("kyc.documents")}</span>
                  <div className="flex gap-2">
                    {formData.kycFrontUrl && <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{t("kyc.front")}</span>}
                    {formData.kycBackUrl && <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{t("kyc.back")}</span>}
                    {formData.kycSelfieUrl && <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{t("kyc.selfie")}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Fraud result display (after submission attempt) */}
            {fraudResult && (
              <div className={`rounded-2xl p-5 border ${
                fraudResult.riskLevel === "LOW" ? 'bg-emerald-500/5 border-emerald-500/20' :
                fraudResult.riskLevel === "MEDIUM" ? 'bg-amber-500/5 border-amber-500/20' :
                'bg-red-500/5 border-red-500/20'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <Shield size={18} className={
                    fraudResult.riskLevel === "LOW" ? 'text-emerald-500' :
                    fraudResult.riskLevel === "MEDIUM" ? 'text-amber-500' : 'text-red-500'
                  } />
                  <div>
                    <p className="text-xs font-black text-white">{t("kyc.fraudScore")}</p>
                    <p className={`text-[10px] font-bold ${
                      fraudResult.riskLevel === "LOW" ? 'text-emerald-500' :
                      fraudResult.riskLevel === "MEDIUM" ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {fraudResult.score}/100 - {t("kyc.riskLevel")} {fraudResult.riskLevel}
                    </p>
                  </div>
                </div>
                {fraudResult.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {fraudResult.flags.map((flag, i) => (
                      <span key={i} className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AML / Terms */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 space-y-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">{t("kyc.amlCompliance")}</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {t("kyc.amlStatement")}
              </p>
              <button
                onClick={() => setAcceptedTerms(!acceptedTerms)}
                className="flex items-center gap-3 w-full"
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  acceptedTerms ? 'bg-blue-600 border-blue-600' : 'border-white/20'
                }`}>
                  {acceptedTerms && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <span className="text-xs font-bold text-slate-300">
                  {t("kyc.acceptTerms")}
                </span>
              </button>
            </div>

            {/* Submit */}
            <button
              disabled={!acceptedTerms || isSubmitting || !formData.kycSelfieUrl}
              onClick={finishKYC}
              className="w-full py-5 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <><Loader2 className="animate-spin" size={18} /> {t("kyc.analyzing")}</>
              ) : (
                <><ShieldCheck size={18} /> {t("kyc.submitKyc")}</>
              )}
            </button>
          </div>
        )}

        {/* Navigation buttons (steps 1-4) */}
        {step < 5 && (
          <div className="pt-6 flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}
                className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 active:scale-95 transition-transform">
                <ArrowLeft size={20} className="text-slate-400" />
              </button>
            )}
            <button
              disabled={!canProceed(step)}
              onClick={() => {
                if (step === 4 && (!formData.kycFrontUrl || !formData.kycBackUrl)) {
                  toast.error(t("kyc.uploadBothSides"));
                  return;
                }
                setStep(step + 1);
              }}
              className="flex-1 h-14 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {t("kyc.next")} <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Back button on step 5 & 6 */}
        {(step === 5 || step === 6) && (
          <div className="pt-2">
            <button onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest active:text-blue-500 transition-colors">
              <ArrowLeft size={14} /> {t("kyc.previousStep")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ---- REUSABLE COMPONENTS ----

function InputField({ label, placeholder, icon, type = "text", value, onChange }: {
  label: string; placeholder?: string; icon: React.ReactNode; type?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">{icon}</div>
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-13 bg-white/[0.03] rounded-xl border border-white/5 pl-12 pr-4 text-sm font-semibold text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-all placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}

function CustomSelect({ label, icon, options, value, onChange, placeholder }: {
  label: string; icon: React.ReactNode; options: string[];
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">{icon}</div>
        <select
          value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full h-13 bg-white/[0.03] rounded-xl border border-white/5 pl-12 pr-10 text-sm font-semibold outline-none appearance-none text-slate-200 focus:border-blue-500/50 transition-all"
        >
          <option value="" disabled className="bg-[#020617]">{placeholder || "Choose..."}</option>
          {options.map((opt, i) => (
            <option key={i} value={opt} className="bg-[#020617]">{opt}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
      </div>
    </div>
  );
}

function DocUploadCard({ label, description, isUploaded, isUploading, onUpload, uploadingText, chooseFileText }: {
  label: string; description: string; isUploaded: boolean; isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingText: string; chooseFileText: string;
}) {
  return (
    <div className={`rounded-2xl border-2 border-dashed p-6 transition-all ${
      isUploaded ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-white/[0.02] border-white/10'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isUploaded ? 'bg-emerald-500/20' : 'bg-blue-600/10'
        }`}>
          {isUploaded ? (
            <CheckCircle2 size={24} className="text-emerald-500" />
          ) : isUploading ? (
            <Loader2 size={24} className="text-blue-500 animate-spin" />
          ) : (
            <Upload size={24} className="text-blue-500" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="text-[10px] text-slate-500">{description}</p>
        </div>
      </div>
      {!isUploaded && (
        <label className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600/10 border border-blue-600/20 cursor-pointer active:scale-[0.98] transition-transform">
          <Upload size={14} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
            {isUploading ? uploadingText : chooseFileText}
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onUpload} disabled={isUploading} />
        </label>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="px-5 py-3 flex items-center justify-between">
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-white text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
