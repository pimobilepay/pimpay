"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, Search, MessageSquare, Mail,
  ChevronRight, HelpCircle, ShieldCheck,
  Wallet, RefreshCcw, ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

export default function HelpPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  // Sécurité pour éviter les erreurs Runtime et d'hydratation
  useEffect(() => {
    setMounted(true);
  }, []);

  const categories = [
    { icon: <Wallet size={20} />, title: "Compte & Wallet", desc: "Gérer vos soldes et KYC" },
    { icon: <RefreshCcw size={20} />, title: "Transactions", desc: "Suivi des swaps et transferts" },
    { icon: <ShieldCheck size={20} />, title: "Sécurité", desc: "Protection de vos fonds" },
  ];

  const faqs = [
    { q: "Comment fonctionne le swap Pi/Fiat ?", a: "Le swap utilise le taux de consensus PimPay pour convertir instantanément vos Pi en USD, EUR ou devises locales." },
    { q: "Quels sont les délais de retrait ?", a: "Les retraits vers vos comptes locaux sont généralement traités en moins de 15 minutes." },
    { q: "Pourquoi mon KYC est-il en attente ?", a: "La validation manuelle peut prendre jusqu'à 24h. Assurez-vous que vos documents sont lisibles." },
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 p-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter italic">
          PimPay <span className="text-blue-500">Support</span>
        </h1>
        <div className="w-10"></div>
      </div>

      {/* Barre de Recherche */}
      <div className="relative mb-10">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Comment pouvons-nous vous aider ?"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/50 border border-white/5 rounded-[2rem] py-5 pl-14 pr-6 outline-none focus:border-blue-500/50 transition-all text-sm text-white"
        />
      </div>

      {/* Catégories de Support */}
      <div className="grid grid-cols-1 gap-4 mb-10">
        {categories.map((cat, i) => (
          <div
            key={i}
            className="group bg-slate-900/60 border border-white/5 p-5 rounded-[2.5rem] flex items-center gap-5 active:scale-95 transition-all"
          >
            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              {cat.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold">{cat.title}</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">{cat.desc}</p>
            </div>
            <ChevronRight size={18} className="text-slate-700" />
          </div>
        ))}
      </div>

      {/* FAQ Express */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-6 px-2">
          <HelpCircle size={16} className="text-blue-500" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Questions Fréquentes</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6">
              <h4 className="text-sm font-bold mb-2">{faq.q}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Options de Contact */}
      <div className="grid grid-cols-2 gap-4">
        <button className="bg-blue-600 p-6 rounded-[2.5rem] flex flex-col items-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
          <MessageSquare size={24} fill="currentColor" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Chat</span>
        </button>

        <button className="bg-slate-900 border border-white/10 p-6 rounded-[2.5rem] flex flex-col items-center gap-3 active:scale-95 transition-all">
          <Mail size={24} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Email</span>
        </button>
      </div>

      {/* Footer Support */}
      <div className="mt-12 text-center pb-10">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2">
          PimPay Protocol <ExternalLink size={10} /> v2.0.4
        </p>
      </div>

      {/* Ajout de la BottomNav avec la prop requise pour le build */}
      {BottomNav && <BottomNav onOpenMenu={() => {}} />}
    </div>
  );
}
