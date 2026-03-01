"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, Briefcase, GraduationCap, Target, Lightbulb, Heart, Quote } from "lucide-react";
import { useRouter } from "next/navigation";

const socialLinks = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/aimardswana",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Twitter",
    href: "https://x.com/pimobilepay",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://youtube.com/@pimobilepay",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://tiktok.com/@pimobilepay",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    href: "https://wa.me/242065540305",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
];

const milestones = [
  { year: "2022", title: "Lancement de PimPay", desc: "Creation de la vision d'une banque virtuelle basee sur Pi Network." },
  { year: "2023", title: "Premiere version beta", desc: "Deploiement de la plateforme de paiement pour les premiers Pioneers." },
  { year: "2024", title: "Expansion internationale", desc: "Ouverture des services en Afrique, Asie et Moyen-Orient." },
  { year: "2025", title: "Siege a Dubai", desc: "Etablissement du siege social a Dubai, Emirats Arabes Unis." },
  { year: "2026", title: "Ecosysteme complet", desc: "Lancement du wallet multi-crypto, cartes virtuelles et services marchands." },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* Header with back button */}
      <div className="relative pt-14 pb-6 px-6">
        <button
          onClick={() => router.back()}
          className="absolute top-14 left-6 p-2 rounded-2xl bg-white/5 border border-white/10 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} className="text-slate-400" />
        </button>
        <h1 className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          A propos du CEO
        </h1>
      </div>

      {/* CEO Hero Section */}
      <div className="flex flex-col items-center px-6 mb-10">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 p-1 shadow-2xl shadow-blue-500/20">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#020617]">
              <Image
                src="/images/ceo-aimard-swana.jpg"
                alt="Portrait du CEO Aimard Swana"
                width={128}
                height={128}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
            CEO & Fondateur
          </div>
        </div>

        <h2 className="mt-8 text-2xl font-black tracking-tight text-balance text-center">
          Aimard Swana
        </h2>
        <p className="mt-1 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          Chief Executive Officer - PimPay
        </p>
      </div>

      {/* Bio Quote */}
      <div className="px-6 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 relative">
          <Quote size={20} className="text-blue-500/30 absolute top-4 left-4" />
          <p className="text-sm text-slate-300 leading-relaxed italic pl-6">
            {"\"Notre mission est de democratiser l'acces aux services financiers pour chaque Pioneer a travers le monde. PimPay n'est pas seulement une application, c'est un pont entre la Pi Network et l'economie reelle.\""}
          </p>
        </div>
      </div>

      {/* Info Sections */}
      <div className="px-6 space-y-6">
        {/* Bio personnelle */}
        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] mb-4 ml-2 flex items-center gap-2">
            <Heart size={12} />
            Biographie
          </h3>
          <div className="bg-white/5 border border-white/10 rounded-[28px] p-6">
            <p className="text-sm text-slate-300 leading-relaxed">
              Aimard Swana est un entrepreneur visionnaire passionne par la technologie blockchain et l'inclusion financiere. Ne avec la conviction que la finance doit etre accessible a tous, il a fonde PimPay pour offrir aux Pioneers du monde entier une plateforme de paiement securisee, rapide et intuitive.
            </p>
          </div>
        </section>

        {/* Vision */}
        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] mb-4 ml-2 flex items-center gap-2">
            <Target size={12} />
            Vision & Mission
          </h3>
          <div className="bg-white/5 border border-white/10 rounded-[28px] overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Target size={18} className="text-blue-400" />
                </div>
                <span className="text-sm font-bold text-white">Vision</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-11">
                Faire de PimPay la premiere banque virtuelle mondiale basee sur Pi Network, accessible a chaque Pioneer, partout dans le monde.
              </p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-emerald-500/10">
                  <Lightbulb size={18} className="text-emerald-400" />
                </div>
                <span className="text-sm font-bold text-white">Mission</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-11">
                Creer un ecosysteme financier complet permettant aux utilisateurs de deposer, envoyer, recevoir et echanger de la valeur en toute securite via la Pi Network.
              </p>
            </div>
          </div>
        </section>

        {/* Infos personnelles */}
        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] mb-4 ml-2 flex items-center gap-2">
            <Briefcase size={12} />
            Informations
          </h3>
          <div className="bg-white/5 border border-white/10 rounded-[28px] overflow-hidden">
            {[
              { icon: <MapPin size={18} />, label: "Localisation", value: "Dubai, Emirats Arabes Unis" },
              { icon: <Briefcase size={18} />, label: "Poste", value: "CEO & Fondateur de PimPay" },
              { icon: <GraduationCap size={18} />, label: "Formation", value: "A renseigner" },
              { icon: <Heart size={18} />, label: "Passion", value: "Blockchain, Fintech, Innovation" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 border-b border-white/5 last:border-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 text-blue-400">{item.icon}</div>
                  <span className="text-sm font-semibold text-slate-300">{item.label}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 max-w-[160px] text-right">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline / Parcours */}
        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] mb-4 ml-2 flex items-center gap-2">
            <Briefcase size={12} />
            Parcours PimPay
          </h3>
          <div className="space-y-3">
            {milestones.map((m, idx) => (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-4"
              >
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                  <span className="text-xs font-black text-blue-400">{m.year}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{m.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Social Links */}
        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] mb-4 ml-2">
            Reseaux sociaux
          </h3>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {socialLinks.map((social) => (
              <Link
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all active:scale-95"
              >
                {social.icon}
                <span className="text-xs font-bold">{social.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="mt-12 px-6">
        <div className="border-t border-white/5 pt-6 text-center">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
            PimPay Financial Technologies - Dubai, UAE
          </p>
          <p className="text-[9px] text-slate-700 mt-1">
            &copy; 2026 Tous droits reserves
          </p>
        </div>
      </div>
    </div>
  );
}
