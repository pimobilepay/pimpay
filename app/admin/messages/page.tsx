"use client";
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import {
  ArrowLeft, Send, Users, UserCog, Search, X, Check, CheckCircle2,
  Mail, Eye, Sparkles, Wrench, Megaphone, Lock, RefreshCw,
  ChevronRight, Loader2, AlertTriangle
} from "lucide-react";

// --- TYPES ---
type Recipient = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  role: string;
  avatar: string | null;
};

type Template = {
  id: string;
  name: string;
  icon: React.ReactNode;
  subject: string;
  color: string;
  bgColor: string;
  borderColor: string;
  body: string;
};

type RoleCounts = { all: number; USER: number; AGENT: number; MERCHANT: number; ADMIN: number };

// --- EMAIL HTML WRAPPER ---
const wrapHtml = (content: string): string => `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:24px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">PimPay</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Plateforme de Paiement Digital</p>
  </td></tr>
  <tr><td style="padding:40px;">${content}</td></tr>
  <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
    <p style="margin:0;color:rgba(148,163,184,0.6);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">PimPay - Tous droits reserves</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

// --- TEMPLATES ---
const EMAIL_TEMPLATES: Template[] = [
  {
    id: "welcome", name: "Bienvenue", icon: <Sparkles size={20} />, subject: "Bienvenue sur PimPay !",
    color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20",
    body: `<h2 style="margin:0 0 16px;color:#ffffff;font-size:20px;font-weight:900;">Bienvenue sur PimPay !</h2>
<p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.7;">Nous sommes ravis de vous accueillir sur notre plateforme de paiement digital. Votre compte est maintenant actif et pret a etre utilise.</p>
<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:16px;padding:20px;margin:20px 0;">
  <p style="margin:0;color:#34d399;font-size:13px;font-weight:700;">Commencez des maintenant :</p>
  <ul style="margin:10px 0 0;padding-left:20px;color:#94a3b8;font-size:13px;line-height:2;">
    <li>Effectuez votre premiere transaction</li>
    <li>Completez votre profil pour debloquer toutes les fonctionnalites</li>
    <li>Decouvrez nos offres exclusives</li>
  </ul>
</div>
<p style="margin:20px 0 0;color:#94a3b8;font-size:13px;">A bientot sur PimPay !</p>`,
  },
  {
    id: "maintenance", name: "Maintenance", icon: <Wrench size={20} />, subject: "Maintenance programmee - PimPay",
    color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20",
    body: `<h2 style="margin:0 0 16px;color:#ffffff;font-size:20px;font-weight:900;">Maintenance Programmee</h2>
<p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.7;">Nous vous informons qu'une maintenance est prevue sur notre plateforme afin d'ameliorer nos services.</p>
<div style="background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.2);border-radius:16px;padding:20px;margin:20px 0;">
  <table width="100%" cellpadding="8" cellspacing="0" style="font-size:13px;">
    <tr><td style="color:#fb923c;font-weight:700;width:40%;">Date :</td><td style="color:#ffffff;font-weight:600;">[A completer]</td></tr>
    <tr><td style="color:#fb923c;font-weight:700;">Duree estimee :</td><td style="color:#ffffff;font-weight:600;">[A completer]</td></tr>
    <tr><td style="color:#fb923c;font-weight:700;">Services affectes :</td><td style="color:#ffffff;font-weight:600;">Tous les services</td></tr>
  </table>
</div>
<p style="margin:20px 0 0;color:#94a3b8;font-size:13px;">Nous nous excusons pour la gene occasionnee. Vos fonds restent en securite.</p>`,
  },
  {
    id: "promo", name: "Promotion", icon: <Megaphone size={20} />, subject: "Offre Speciale PimPay !",
    color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20",
    body: `<h2 style="margin:0 0 16px;color:#ffffff;font-size:20px;font-weight:900;">Offre Speciale !</h2>
<p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.7;">Profitez d'une offre exclusive reservee a nos utilisateurs fideles.</p>
<div style="background:linear-gradient(135deg,rgba(37,99,235,0.15),rgba(59,130,246,0.1));border:1px solid rgba(59,130,246,0.25);border-radius:16px;padding:24px;margin:20px 0;text-align:center;">
  <p style="margin:0;color:#60a5fa;font-size:28px;font-weight:900;letter-spacing:2px;">[OFFRE]</p>
  <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Valable jusqu'au [DATE]</p>
</div>
<p style="margin:20px 0 0;color:#94a3b8;font-size:13px;">Ne manquez pas cette opportunite unique !</p>`,
  },
  {
    id: "security", name: "Securite", icon: <Lock size={20} />, subject: "Alerte Securite - PimPay",
    color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/20",
    body: `<h2 style="margin:0 0 16px;color:#ffffff;font-size:20px;font-weight:900;">Alerte Securite</h2>
<p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.7;">Nous vous contactons au sujet de la securite de votre compte PimPay.</p>
<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:16px;padding:20px;margin:20px 0;">
  <p style="margin:0 0 10px;color:#f87171;font-size:14px;font-weight:700;">Recommandations importantes :</p>
  <ul style="margin:0;padding-left:20px;color:#94a3b8;font-size:13px;line-height:2;">
    <li>Changez votre mot de passe regulierement</li>
    <li>Ne partagez jamais votre code PIN</li>
    <li>Activez l'authentification a deux facteurs</li>
    <li>Verifiez toujours l'URL avant de vous connecter</li>
  </ul>
</div>
<p style="margin:20px 0 0;color:#94a3b8;font-size:13px;">Si vous n'etes pas a l'origine de cette action, contactez-nous immediatement.</p>`,
  },
  {
    id: "update", name: "Mise a jour", icon: <RefreshCw size={20} />, subject: "Nouveautes PimPay - Mise a jour",
    color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/20",
    body: `<h2 style="margin:0 0 16px;color:#ffffff;font-size:20px;font-weight:900;">Nouvelles Fonctionnalites !</h2>
<p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.7;">Nous avons le plaisir de vous annoncer de nouvelles fonctionnalites sur PimPay.</p>
<div style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.2);border-radius:16px;padding:20px;margin:20px 0;">
  <p style="margin:0 0 12px;color:#22d3ee;font-size:14px;font-weight:700;">Quoi de neuf ?</p>
  <ul style="margin:0;padding-left:20px;color:#94a3b8;font-size:13px;line-height:2;">
    <li>[Fonctionnalite 1]</li>
    <li>[Fonctionnalite 2]</li>
    <li>[Fonctionnalite 3]</li>
  </ul>
</div>
<p style="margin:20px 0 0;color:#94a3b8;font-size:13px;">Mettez a jour votre application pour profiter de ces ameliorations.</p>`,
  },
  {
    id: "custom", name: "Personnalise", icon: <Mail size={20} />, subject: "",
    color: "text-violet-400", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/20",
    body: `<h2 style="margin:0 0 16px;color:#ffffff;font-size:20px;font-weight:900;">[Votre titre ici]</h2>
<p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.7;">[Votre message ici]</p>`,
  },
];

// --- STEP INDICATOR ---
const StepIndicator = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
  <div className="flex items-center gap-2 px-1">
    {steps.map((label, i) => (
      <React.Fragment key={label}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
            i < currentStep ? "bg-emerald-500 text-white" : i === currentStep ? "bg-blue-600 text-white" : "bg-white/5 text-slate-600"
          }`}>
            {i < currentStep ? <Check size={12} /> : i + 1}
          </div>
          <span className={`text-[8px] font-black uppercase tracking-widest hidden sm:inline ${
            i === currentStep ? "text-white" : "text-slate-600"
          }`}>{label}</span>
        </div>
        {i < steps.length - 1 && <div className={`flex-1 h-px ${i < currentStep ? "bg-emerald-500/50" : "bg-white/5"}`} />}
      </React.Fragment>
    ))}
  </div>
);

// --- MAIN PAGE ---
export default function AdminMessagesPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Data
  const [users, setUsers] = useState<Recipient[]>([]);
  const [counts, setCounts] = useState<RoleCounts>({ all: 0, USER: 0, AGENT: 0, MERCHANT: 0, ADMIN: 0 });
  const [searchQuery, setSearchQuery] = useState("");

  // Selection
  const [recipientType, setRecipientType] = useState<"all" | "role" | "individual">("all");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  // Email content
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");

  // Auth token
  const getToken = useCallback(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || document.cookie.split("token=")[1]?.split(";")[0] || "";
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async (search = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/messages?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setCounts(data.counts || { all: 0, USER: 0, AGENT: 0, MERCHANT: 0, ADMIN: 0 });
      }
    } catch {
      toast.error("Erreur chargement utilisateurs");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    const t = setTimeout(() => { if (searchQuery) fetchUsers(searchQuery); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, fetchUsers]);

  // Computed
  const recipientCount = useMemo(() => {
    if (recipientType === "all") return counts.all;
    if (recipientType === "role") return counts[selectedRole as keyof RoleCounts] || 0;
    return selectedEmails.length;
  }, [recipientType, selectedRole, selectedEmails, counts]);

  const fullHtml = useMemo(() => wrapHtml(htmlBody), [htmlBody]);

  // Iframe preview
  useEffect(() => {
    if (showPreview && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(fullHtml); doc.close(); }
    }
  }, [showPreview, fullHtml]);

  // Send
  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    try {
      const payload: Record<string, unknown> = { subject, html: fullHtml, recipientType };
      if (recipientType === "role") payload.role = selectedRole;
      if (recipientType === "individual") payload.emails = selectedEmails;

      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ sent: data.sent, failed: data.failed, total: data.total });
        toast.success(`${data.sent} email(s) envoye(s) avec succes`);
      } else {
        toast.error(data.error || "Echec envoi");
      }
    } catch {
      toast.error("Erreur reseau");
    } finally {
      setSending(false);
    }
  };

  const canProceedStep0 = recipientType === "all" || (recipientType === "role" && !!selectedRole) || (recipientType === "individual" && selectedEmails.length > 0);
  const canProceedStep1 = !!selectedTemplate;
  const canProceedStep2 = !!subject && !!htmlBody;

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]);
  };

  const resetAll = () => {
    setSendResult(null);
    setStep(0);
    setSelectedTemplate(null);
    setSubject("");
    setHtmlBody("");
    setSelectedEmails([]);
    setSelectedRole("");
    setRecipientType("all");
    setShowPreview(false);
  };

  // --- SUCCESS SCREEN ---
  if (sendResult) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${sendResult.failed === 0 ? "bg-emerald-500" : "bg-amber-500"}`}>
            {sendResult.failed === 0 ? <CheckCircle2 size={36} /> : <AlertTriangle size={36} />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[4px] text-slate-500 mb-2">Envoi termine</p>
            <p className="text-3xl font-black">{sendResult.sent}<span className="text-slate-500">/{sendResult.total}</span></p>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Emails envoyes</p>
          </div>
          {sendResult.failed > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <p className="text-[10px] font-black text-red-400 uppercase">{sendResult.failed} echec(s)</p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <Button onClick={resetAll} className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">
              Nouveau Message
            </Button>
            <Button onClick={() => router.push("/admin/dashboard")} variant="outline" className="flex-1 h-14 border-white/10 bg-white/5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white hover:text-white hover:bg-white/10">
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-[#020617] text-white pb-28">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5 px-6 py-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <button onClick={() => step > 0 ? setStep(step - 1) : router.push("/admin/dashboard")} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[3px]">Messages</p>
              <p className="text-sm font-black text-white uppercase tracking-tight">Campagne Email</p>
            </div>
          </div>
          {step === 2 && (
            <button onClick={() => setShowPreview(!showPreview)} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showPreview ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}>
              <Eye size={14} /> {showPreview ? "Editeur" : "Apercu"}
            </button>
          )}
        </div>
        <StepIndicator currentStep={step} steps={["Destinataires", "Template", "Contenu"]} />
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto">

        {/* =================== STEP 0 : RECIPIENTS =================== */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">Type de destinataire</p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { type: "all" as const, label: "Tous", desc: `${counts.all} utilisateurs`, icon: <Users size={18} /> },
                  { type: "role" as const, label: "Par role", desc: "Filtrer par role", icon: <UserCog size={18} /> },
                  { type: "individual" as const, label: "Individuel", desc: "Choisir un par un", icon: <Mail size={18} /> },
                ]).map(({ type, label, desc, icon }) => (
                  <button
                    key={type}
                    onClick={() => { setRecipientType(type); setSelectedRole(""); setSelectedEmails([]); }}
                    className={`p-5 rounded-2xl border text-center transition-all active:scale-95 ${
                      recipientType === type ? "bg-blue-600/15 border-blue-500/40 shadow-lg shadow-blue-500/10" : "bg-slate-900/40 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className={`mx-auto mb-3 ${recipientType === type ? "text-blue-400" : "text-slate-600"}`}>{icon}</div>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${recipientType === type ? "text-white" : "text-slate-400"}`}>{label}</p>
                    <p className="text-[8px] font-bold text-slate-600 mt-1">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Role selector */}
            {recipientType === "role" && (
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Selectionner un role</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["USER", "AGENT", "MERCHANT", "ADMIN"] as const).map((role) => (
                    <button key={role} onClick={() => setSelectedRole(role)}
                      className={`p-4 rounded-2xl border text-center transition-all active:scale-95 ${
                        selectedRole === role ? "bg-blue-600/15 border-blue-500/40" : "bg-slate-900/40 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <p className={`text-[10px] font-black uppercase tracking-wider ${selectedRole === role ? "text-white" : "text-slate-400"}`}>{role}</p>
                      <p className="text-[8px] font-bold text-slate-600 mt-1">{counts[role] || 0} utilisateurs</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Individual user search */}
            {recipientType === "individual" && (
              <div className="space-y-4">
                <div className="relative">
                  <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="RECHERCHER PAR NOM OU EMAIL..."
                    className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-6 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(""); fetchUsers(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Selected chips */}
                {selectedEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedEmails.map((email) => (
                      <span key={email} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/15 border border-blue-500/30 rounded-full text-[9px] font-black text-blue-300 uppercase tracking-wider">
                        {email}
                        <button onClick={() => toggleEmail(email)} className="text-blue-400 hover:text-white"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}

                {/* User list */}
                {loading ? (
                  <div className="py-12 text-center">
                    <Loader2 size={20} className="animate-spin mx-auto text-blue-500 mb-3" />
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Chargement...</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                    {users.map((user) => {
                      if (!user.email) return null;
                      const isSelected = selectedEmails.includes(user.email);
                      return (
                        <button key={user.id} onClick={() => toggleEmail(user.email!)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                            isSelected ? "bg-blue-600/10 border-blue-500/30" : "bg-slate-900/40 border-white/5 hover:border-white/10"
                          }`}
                        >
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10" crossOrigin="anonymous" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black bg-slate-800 border border-white/5 text-slate-400 uppercase">
                              {user.username?.[0] || user.name?.[0] || "?"}
                            </div>
                          )}
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-xs font-black text-white uppercase tracking-tight truncate">{user.username || user.name || "Sans nom"}</p>
                            <p className="text-[10px] text-slate-500 font-bold font-mono truncate">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[7px] font-black px-2 py-0.5 rounded-full border border-white/10 text-slate-500 uppercase">{user.role}</span>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? "bg-blue-600 text-white" : "bg-white/5 text-transparent"}`}>
                              <Check size={10} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Summary footer */}
            <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-5 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Destinataires selectionnes</p>
                <p className="text-xl font-black text-white">{recipientCount}</p>
              </div>
              <Button onClick={() => setStep(1)} disabled={!canProceedStep0}
                className="h-12 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl px-6 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                Suivant <ChevronRight size={14} />
              </Button>
            </Card>
          </div>
        )}

        {/* =================== STEP 1 : TEMPLATE =================== */}
        {step === 1 && (
          <div className="space-y-5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Choisir un template</p>
            <div className="grid grid-cols-2 gap-3">
              {EMAIL_TEMPLATES.map((tpl) => (
                <button key={tpl.id}
                  onClick={() => { setSelectedTemplate(tpl); setSubject(tpl.subject); setHtmlBody(tpl.body); }}
                  className={`p-5 rounded-2xl border text-left transition-all active:scale-95 space-y-3 ${
                    selectedTemplate?.id === tpl.id ? `${tpl.bgColor} ${tpl.borderColor} shadow-lg` : "bg-slate-900/40 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className={selectedTemplate?.id === tpl.id ? tpl.color : "text-slate-600"}>{tpl.icon}</div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${selectedTemplate?.id === tpl.id ? "text-white" : "text-slate-400"}`}>{tpl.name}</p>
                    {tpl.subject && <p className="text-[8px] font-bold text-slate-600 mt-1 truncate">{tpl.subject}</p>}
                  </div>
                </button>
              ))}
            </div>

            <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-5 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Template</p>
                <p className="text-sm font-black text-white uppercase">{selectedTemplate?.name || "Aucun"}</p>
              </div>
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}
                className="h-12 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl px-6 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                Suivant <ChevronRight size={14} />
              </Button>
            </Card>
          </div>
        )}

        {/* =================== STEP 2 : CONTENT =================== */}
        {step === 2 && (
          <div className="space-y-5">
            {!showPreview ? (
              <>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{"Sujet de l'email"}</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="SUJET DU MESSAGE..."
                    className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl px-6 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Contenu HTML</label>
                    <span className="text-[8px] font-bold text-slate-600">{htmlBody.length} caracteres</span>
                  </div>
                  <textarea value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} rows={16}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-5 text-xs font-mono text-slate-300 outline-none focus:border-blue-500/50 transition-colors resize-none leading-relaxed placeholder:text-slate-600"
                    placeholder={'<h2>Titre</h2>\n<p>Votre contenu ici...</p>'}
                  />
                </div>

                {/* Recap */}
                <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-5 space-y-3">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Recapitulatif</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/[0.03] p-3 rounded-xl text-center">
                      <p className="text-[7px] font-black text-slate-600 uppercase tracking-wider">Destinataires</p>
                      <p className="text-sm font-black text-white">{recipientCount}</p>
                    </div>
                    <div className="bg-white/[0.03] p-3 rounded-xl text-center">
                      <p className="text-[7px] font-black text-slate-600 uppercase tracking-wider">Type</p>
                      <p className="text-[10px] font-black text-white uppercase">
                        {recipientType === "all" ? "Tous" : recipientType === "role" ? selectedRole : "Individuel"}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] p-3 rounded-xl text-center">
                      <p className="text-[7px] font-black text-slate-600 uppercase tracking-wider">Template</p>
                      <p className="text-[10px] font-black text-white uppercase">{selectedTemplate?.name}</p>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              /* Live HTML preview in iframe */
              <Card className="bg-slate-900/60 border-white/5 rounded-[2.5rem] p-2 overflow-hidden">
                <div className="bg-slate-800 rounded-t-[2rem] p-4 flex items-center gap-3 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 font-mono flex-1 text-center truncate">{subject || "Apercu email"}</p>
                </div>
                <iframe ref={iframeRef} title="Apercu email" className="w-full bg-[#0f172a] rounded-b-[2rem]" style={{ height: "500px", border: "none" }} sandbox="allow-same-origin" />
              </Card>
            )}

            {/* Send button */}
            <Button onClick={() => setShowConfirm(true)} disabled={!canProceedStep2 || sending}
              className="w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
              {sending ? <><Loader2 size={18} className="animate-spin" /> Envoi en cours...</> : <><Send size={18} /> {"Envoyer a"} {recipientCount} {"destinataire(s)"}</>}
            </Button>
          </div>
        )}
      </div>

      {/* =================== CONFIRM MODAL =================== */}
      {showConfirm && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setShowConfirm(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 w-full max-w-sm space-y-5 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-600/15 border border-blue-500/30 flex items-center justify-center">
                <Send size={24} className="text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[3px]">{"Confirmer l'envoi"}</p>
                <p className="text-sm font-black text-white uppercase mt-1">{recipientCount} {"destinataire(s)"}</p>
              </div>
            </div>

            <div className="bg-white/[0.03] rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-[9px]">
                <span className="font-black text-slate-500 uppercase tracking-wider">Sujet</span>
                <span className="font-bold text-white text-right max-w-[60%] truncate">{subject}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="font-black text-slate-500 uppercase tracking-wider">Type</span>
                <span className="font-bold text-white uppercase">{recipientType === "all" ? "Tous" : recipientType === "role" ? selectedRole : "Individuel"}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="font-black text-slate-500 uppercase tracking-wider">Template</span>
                <span className="font-bold text-white uppercase">{selectedTemplate?.name}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setShowConfirm(false)} variant="outline"
                className="flex-1 h-12 border-white/10 bg-white/5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white hover:text-white hover:bg-white/10">
                Annuler
              </Button>
              <Button onClick={handleSend}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                <Send size={14} /> Envoyer
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
