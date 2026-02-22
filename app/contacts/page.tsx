"use client";                                         
import { useState } from "react";                     import {
  ArrowLeft, Mail, Phone, MessageCircle,                Send, ShieldCheck, Headphones, ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import ChatBubble from "@/components/ChatBubble";

export default function ContactsPage() {
  const router = useRouter();

  const handleOpenMenu = () => {
    console.log("Pimpay Protocol: Menu Request");
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSending, setIsSending] = useState(false);

  // MODIFICATION : Connexion réelle à l'API PimPay Support
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Server Unreachable");

      toast.success("Ticket PimPay transmis", {
        description: "Votre requête est en cours d'analyse par le protocole.",
      });

      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast.error("Échec de transmission", {
        description: "Vérifiez votre connexion au réseau Pi.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const contactMethods = [
    {
      icon: <Mail className="text-blue-400" size={20} />,
      label: "Email Support",
      value: "support@pimpay.pi",
      link: "mailto:support@pimpay.pi"
    },
    {
      icon: <MessageCircle className="text-emerald-400" size={20} />,
      label: "WhatsApp Direct",
      value: "+242 065 540 305",
      link: "https://wa.me/242065540305"
    },
    {
      icon: <Phone className="text-purple-400" size={20} />,
      label: "Ligne Prioritaire",
      value: "+242 065 540 305",
      link: "tel:+242065540305"
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans selection:bg-blue-500/30">

      {/* Header FinTech */}
      <div className="px-6 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Support Client</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opérateurs en ligne</p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
          <Headphones size={20} className="text-blue-500" />
        </div>
      </div>

      <main className="px-6 mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Contact Grid */}
        <div className="grid grid-cols-1 gap-3">
          {contactMethods.map((method, idx) => (
            <a
              key={idx}
              href={method.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-slate-900/40 border border-white/5 rounded-[24px] hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
                  {method.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{method.label}</p>
                  <p className="text-sm font-bold text-white">{method.value}</p>
                </div>
              </div>
              <ExternalLink size={14} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
            </a>
          ))}
        </div>

        {/* Formulaire Web3 Style */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
            Transmission de requête
          </h3>

          <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 backdrop-blur-sm space-y-5">
            <div className="space-y-4">
              {/* Nom */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nom complet</label>
                <input
                  type="text"
                  required
                  placeholder="JEAN KABONGO"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700 text-white"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Adresse Email</label>
                <input
                  type="email"
                  required
                  placeholder="JEAN@PIMPAY.PI"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700 text-white"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              {/* Sujet */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Objet de la demande</label>
                <input
                  type="text"
                  required
                  placeholder="EX: PROBLÈME DE DÉPÔT"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700 text-white"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Votre Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="DÉCRIVEZ VOTRE SITUATION ICI..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700 resize-none text-white"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full flex items-center justify-center gap-3 p-5 bg-blue-600 rounded-2xl text-white font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isSending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Transmission...
                </span>
              ) : (
                <>
                  <Send size={18} />
                  Envoyer le ticket
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Connexion chiffrée de bout en bout</span>
            </div>
            <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">
              PIMPAY SUPPORT PROTOCOL • KINSHASA, RDC
            </p>
        </div>

      </main>

      <ChatBubble />
      <BottomNav onOpenMenu={handleOpenMenu} />
    </div>
  );
}
