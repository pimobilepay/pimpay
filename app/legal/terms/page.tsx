"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Lucide from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

export default function TermsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sections = [
    {
      id: "1",
      title: "Acceptation des conditions",
      content: "En utilisant l’application PiMPay, vous acceptez sans réserve les présentes conditions d’utilisation. Ce service est réservé aux membres de la communauté Pi Network ayant completé leur enregistrement."
    },
    {
      id: "2",
      title: "Utilisation du service",
      content: "Vous vous engagez à utiliser le service PiMPay conformément aux lois en vigueur. Toute tentative d'exploitation frauduleuse des taux de change ou du protocole de swap entraînera la suspension du compte."
    },
    {
      id: "3",
      title: "Sécurité du compte",
      content: "Vous êtes responsable de la confidentialité de votre compte et de vos identifiants. PimPay ne vous demandera jamais votre phrase de récupération Pi par email ou message direct."
    },
    {
      id: "4",
      title: "Paiements et transactions",
      content: "Toutes les transactions effectuées via PiMPay sont irréversibles une fois confirmées sur la blockchain Pi. Les frais de réseau (0.01 π) sont appliqués à chaque opération de retrait ou de swap."
    },
    {
      id: "5",
      title: "Limitation de responsabilité",
      content: "PiMPay ne pourra être tenu responsable des pertes résultant de la volatilité du marché ou d'erreurs de saisie de l'utilisateur lors des transferts."
    },
    {
      id: "6",
      title: "Contact",
      content: "Pour toute question juridique ou réclamation, veuillez contacter notre équipe via la section Support ou à l'adresse juridique@pimpay.pi."
    }
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 p-6 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 pt-4">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"
        >
          <Lucide.ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter italic">
          PimPay <span className="text-blue-500">Terms</span>
        </h1>
        <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 border border-white/10">
          <Lucide.ScrollText size={18} />
        </div>
      </div>

      {/* BANNER */}
      <div className="mb-8 p-5 bg-blue-600/10 border border-blue-500/20 rounded-[2rem] flex items-center gap-4 backdrop-blur-sm">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Lucide.ShieldCheck size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Dernière mise à jour</p>
          <p className="text-xs font-bold text-white">Janvier 2026</p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.id} className="relative pl-6 border-l border-white/5">
            <div className="absolute top-0 left-[-1px] w-[2px] h-4 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
              {section.id}. {section.title}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="mt-12 p-6 bg-white/[0.02] border border-white/5 rounded-[2.5rem] text-center">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">
          PimPay Protocol Compliance Office
        </p>
      </div>

      {/* CORRECTION : Ajout de la prop onOpenMenu pour satisfaire TypeScript */}
      {BottomNav ? <BottomNav onOpenMenu={() => {}} /> : null}
    </div>
  );
}
