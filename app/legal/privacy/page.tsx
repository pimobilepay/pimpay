"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Lucide from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

export default function PolitiqueConfidentialite() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sections = [
    {
      title: "1. Introduction",
      content: "Cette Politique de Confidentialité décrit comment PIMPAY collecte, utilise, protège et partage vos informations personnelles lorsque vous utilisez nos services numériques."
    },
    {
      title: "2. Informations collectées",
      content: "Nous collectons les données fournies directement (nom, téléphone, email, KYC) ainsi que des données techniques (adresse IP, modèle d’appareil, version du système) pour garantir la sécurité de vos accès."
    },
    {
      title: "3. Utilisation des données",
      content: "Vos informations sont utilisées pour assurer le fonctionnement sécurisé du service, vérifier votre identité (KYC), prévenir les fraudes et envoyer des notifications liées à votre compte."
    },
    {
      title: "4. Partage des données",
      content: "PimPay ne vend jamais vos données. Le partage est strictement limité aux fournisseurs techniques certifiés et aux autorités légales si requis par la loi."
    },
    {
      title: "5. Sécurité",
      content: "Nous utilisons le chiffrement de bout en bout pour les communications et un stockage sécurisé avec des contrôles d'accès stricts pour protéger vos fonds et votre identité."
    },
    {
      title: "6. Vos droits",
      content: "Vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Ces demandes peuvent être formulées directement via notre support."
    }
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 p-6 font-sans">

      {/* HEADER HARMONISÉ */}
      <div className="flex justify-between items-center mb-10 pt-4">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"
        >
          <Lucide.ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter italic">
          PimPay <span className="text-blue-500">Privacy</span>
        </h1>
        <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 border border-white/10">
          <Lucide.ShieldCheck size={18} />
        </div>
      </div>

      {/* BANNER INFO */}
      <div className="mb-8 p-5 bg-blue-600/10 border border-blue-500/20 rounded-[2rem] flex items-center gap-4 backdrop-blur-sm">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 text-white">
          <Lucide.Lock size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Dernière mise à jour</p>
          <p className="text-xs font-bold text-white">Janvier 2026</p>
        </div>
      </div>

      {/* CONTENT FLOW */}
      <div className="space-y-8">
        {sections.map((section, index) => (
          <div key={index} className="relative pl-6 border-l border-white/5">
            <div className="absolute top-0 left-[-1px] w-[2px] h-4 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div>

            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">
              {section.title}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {section.content}
            </p>
          </div>
        ))}

        {/* SECTION CONTACT SPÉCIALE */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 mt-10">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500 mb-4 text-center">
            Contact Support
          </h2>
          <div className="space-y-3 text-center">
            <p className="text-xs text-slate-300 font-bold">📧 support@pimpay.pi</p>
            <p className="text-xs text-slate-300 font-bold">📞 +242 065 540 305</p>
          </div>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="mt-12 text-center opacity-30">
        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">
          Data Protection Officer • PimPay Protocol
        </p>
      </div>

      {/* CORRECTION ICI : Ajout de la fonction onOpenMenu requise */}
      {BottomNav && <BottomNav onOpenMenu={() => {}} />}
    </div>
  );
}
