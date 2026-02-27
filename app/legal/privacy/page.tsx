"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ShieldCheck, Lock, Eye, Server,
  Globe, Users, FileText, AlertTriangle, Database,
  Fingerprint, Mail, Phone, ChevronDown
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

export default function PolitiqueConfidentialite() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sections = [
    {
      icon: <FileText size={16} />,
      title: "1. Introduction",
      content:
        "Cette Politique de Confidentialite decrit comment PIMPAY collecte, utilise, protege et partage vos informations personnelles lorsque vous utilisez nos services numeriques. PimPay est une plateforme fintech multi-chaines integree aux ecosystemes Sidra Chain et Pi Network, operant en conformite avec les standards SMIIC, AAOIFI et les principes de la finance islamique.",
    },
    {
      icon: <Database size={16} />,
      title: "2. Informations collectees",
      content:
        "Nous collectons les categories de donnees suivantes :\n\n- Donnees d'identite : nom, prenom, date de naissance, nationalite, genre, adresse postale.\n- Donnees de contact : numero de telephone, adresse email.\n- Donnees KYC : type et numero de piece d'identite, dates de delivrance et d'expiration, pays d'emission, photo recto/verso du document, selfie de verification.\n- Donnees financieres : adresses de wallets (Pi, Sidra, USDT TRC20, Bitcoin), soldes, historique des transactions, beneficiaires enregistres.\n- Donnees techniques : adresse IP, modele d'appareil, navigateur, systeme d'exploitation, geolocalisation (ville, pays, coordonnees GPS), user-agent.\n- Donnees de session : tokens d'authentification, horodatage des connexions, tentatives de connexion echouees, derniere activite.",
    },
    {
      icon: <Eye size={16} />,
      title: "3. Utilisation des donnees",
      content:
        "Vos informations sont utilisees pour :\n\n- Assurer le fonctionnement securise du service et traiter vos transactions (TRANSFER, WITHDRAW, DEPOSIT, PAYMENT, EXCHANGE, STAKING_REWARD, AIRDROP, CARD_PURCHASE).\n- Verifier votre identite via le processus KYC (statuts : NONE, PENDING, VERIFIED, REJECTED, APPROVED).\n- Prevenir les fraudes grace au suivi des sessions, au journal de securite (SecurityLog) et au journal d'audit (AuditLog).\n- Calculer et afficher les frais de transaction de maniere transparente conformement au principe Anti-Gharar de la Sidra Chain.\n- Gerer vos wallets multi-devises (XAF, EUR, USD, CDF, Pi, Sidra).\n- Emettre et gerer vos cartes virtuelles (CLASSIC, GOLD, BUSINESS, ULTRA).\n- Envoyer des notifications liees a votre compte (transactions, securite, promotions).",
    },
    {
      icon: <Users size={16} />,
      title: "4. Partage des donnees",
      content:
        "PimPay ne vend jamais vos donnees personnelles. Le partage est strictement limite aux cas suivants :\n\n- Fournisseurs techniques certifies : hebergement de la base de donnees PostgreSQL, infrastructure de noeud Sidra Chain (node.sidrachain.com), et SDK Pi Network pour l'authentification.\n- Conseil de Surveillance Sharia (SSB) : acces anonymise aux donnees de transaction pour la validation de conformite selon le standard SMIIC 1:2020.\n- Partenaires Banking-as-a-Service (BaaS) : partage minimal requis pour les operations bancaires sous licences partenaires.\n- Autorites legales : divulgation si requis par la loi, un mandat judiciaire ou une obligation reglementaire.\n- Aucune donnee n'est partagee avec des tiers a des fins publicitaires.",
    },
    {
      icon: <Lock size={16} />,
      title: "5. Securite des donnees",
      content:
        "PimPay met en oeuvre les mesures de securite suivantes :\n\n- Chiffrement AES-256 pour les donnees au repos (cles privees Sidra, USDT, codes PIN de cartes).\n- Protocole TLS 1.3 pour toutes les communications en transit.\n- Authentification a deux facteurs (2FA) via OTP.\n- Code PIN secondaire obligatoire pour les transactions sensibles.\n- Suivi des sessions avec IP, appareil, navigateur et geolocalisation.\n- Comptage des tentatives de connexion echouees avec gel automatique du compte.\n- Masquage dynamique des donnees sensibles sur l'interface (numeros de carte, CVV, soldes).\n- Controle d'acces par role (ADMIN, USER, MERCHANT, AGENT) avec separation des privileges.\n- Journal d'audit complet pour chaque action administrative.",
    },
    {
      icon: <Globe size={16} />,
      title: "6. Donnees blockchain",
      content:
        "Les donnees liees aux blockchains sont traitees comme suit :\n\n- Sidra Chain : votre adresse Sidra et l'historique des transactions sur le Mainnet sont publics par nature. Les cles privees (sidraPrivateKey) sont chiffrees et jamais exposees. Les frais de gaz sont calcules selon les couts reels du reseau (environ 0.0001 SDR), conformement aux principes de la finance ethique.\n\n- Pi Network : votre Pi User ID (piUserId) est lie a votre compte PimPay. Les transactions Pi sont tracees via leur identifiant blockchain (blockchainTx). L'integration SDK Pi v2.0 assure que l'authentification Pi reste securisee.\n\n- USDT TRC20 : votre adresse USDT et cle privee sont stockees de maniere chiffree. Seules les transactions que vous initiez sont partagees avec le reseau TRON.",
    },
    {
      icon: <Server size={16} />,
      title: "7. Conservation des donnees",
      content:
        "Les durees de conservation sont les suivantes :\n\n- Donnees de profil et KYC : conservees tant que le compte est actif, puis 5 ans apres la cloture conformement aux obligations reglementaires.\n- Historique des transactions : conserve indefiniment pour les besoins d'audit et de conformite Basel III.\n- Donnees de session et logs de securite : conserves 12 mois puis anonymises.\n- Tickets de support et messages : conserves 3 ans apres resolution.\n- Donnees de geolocalisation : conservees 6 mois pour la detection de fraude.",
    },
    {
      icon: <Fingerprint size={16} />,
      title: "8. Vos droits",
      content:
        "En tant qu'utilisateur de PimPay, vous disposez des droits suivants :\n\n- Droit d'acces : obtenir une copie de toutes vos donnees personnelles stockees.\n- Droit de rectification : corriger vos informations de profil (nom, adresse, contact).\n- Droit de suppression : demander la suppression de votre compte et donnees associees (sous reserve des obligations legales de conservation).\n- Droit de portabilite : exporter vos donnees dans un format structure.\n- Droit d'opposition : refuser le traitement de vos donnees a des fins non essentielles.\n- Droit de restriction : limiter temporairement le traitement de vos donnees.\n- Droit de gel de compte : vous pouvez demander le gel de votre compte (statut FROZEN) a tout moment via le support.\n\nPour exercer ces droits, contactez notre support ou envoyez un email a privacy@pimpay.pi.",
    },
    {
      icon: <AlertTriangle size={16} />,
      title: "9. Geo-restriction et conformite",
      content:
        "PimPay applique un controle d'acces par juridiction pour respecter les lois bancaires locales :\n\n- Le service est geo-restreint aux juridictions autorisees.\n- L'acces est controle par adresse IP et geolocalisation de l'appareil.\n- Les devises disponibles dependent du pays de residence (XAF pour la zone CEMAC, EUR pour l'Europe, etc.).\n- La conformite avec les standards Basel III est assuree via des modules de reporting pour le suivi des ratios de liquidite.\n- Le Conseil de Surveillance Sharia (SSB) valide chaque nouveau produit financier avant son lancement (Fatwa de conformite).",
    },
    {
      icon: <ShieldCheck size={16} />,
      title: "10. Modifications de la politique",
      content:
        "PimPay se reserve le droit de modifier cette politique de confidentialite a tout moment. Les utilisateurs seront notifies de tout changement significatif via le systeme de notifications in-app. La version en vigueur est toujours accessible depuis les parametres de l'application et la section Liens Utiles du Centre d'Aide. En continuant d'utiliser le service apres modification, vous acceptez les termes mis a jour.",
    },
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      <div className="p-6 pt-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.back()}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">
            PimPay <span className="text-blue-500">Privacy</span>
          </h1>
          <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 border border-white/10">
            <ShieldCheck size={18} />
          </div>
        </div>

        {/* Banner */}
        <div className="mb-8 p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-4 backdrop-blur-sm">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 text-white">
            <Lock size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
              Derniere mise a jour
            </p>
            <p className="text-xs font-bold text-white">Fevrier 2026</p>
          </div>
        </div>

        {/* Scope Banner */}
        <div className="mb-8 bg-slate-900/60 border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Champ d'application
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cette politique s'applique a tous les services PimPay, incluant les wallets multi-devises (XAF, EUR, USD, CDF, Pi, Sidra), les cartes virtuelles, les transactions blockchain (Sidra Chain, Pi Network, USDT TRC20) et l'ensemble des fonctionnalites de la plateforme.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="px-6 space-y-3">
        {sections.map((section, index) => (
          <div
            key={index}
            className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden"
          >
            <button
              onClick={() =>
                setOpenSection(openSection === index ? null : index)
              }
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              <span className="text-blue-500 shrink-0">{section.icon}</span>
              <h2 className="text-xs font-bold flex-1">{section.title}</h2>
              <ChevronDown
                size={14}
                className={`text-slate-600 shrink-0 transition-transform ${
                  openSection === index ? "rotate-180" : ""
                }`}
              />
            </button>
            {openSection === index && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3">
                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="px-6 mt-8">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-center">
          <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-blue-500 mb-4">
            Responsable Protection des Donnees
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Mail size={14} className="text-slate-500" />
              <p className="text-xs text-slate-300 font-bold">privacy@pimpay.pi</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Phone size={14} className="text-slate-500" />
              <p className="text-xs text-slate-300 font-bold">+242 065 540 305</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center px-6">
        <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">
          Data Protection Officer - PimPay Protocol
        </p>
        <p className="text-[8px] text-slate-800 mt-1">
          Sidra Chain + Pi Network - Conformite SMIIC / AAOIFI / Basel III
        </p>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
