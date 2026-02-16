"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ScrollText, ShieldCheck, ChevronDown,
  Scale, UserCheck, CreditCard, ArrowRightLeft,
  Globe, Lock, AlertTriangle, Ban,
  Gavel, Mail, Phone, Landmark, Zap
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

export default function TermsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sections = [
    {
      icon: <Scale size={16} />,
      id: "1",
      title: "Acceptation des conditions",
      content:
        "En utilisant l'application PimPay, vous acceptez sans reserve les presentes conditions d'utilisation. Ce service est reserve aux membres des ecosystemes Pi Network et Sidra Chain ayant complete leur enregistrement. L'acces a certaines fonctionnalites (retraits, swaps, cartes virtuelles) est conditionne a la verification de votre identite (KYC). PimPay est une plateforme fintech conforme aux principes de la finance islamique, operant sous les standards SMIIC et AAOIFI.",
    },
    {
      icon: <UserCheck size={16} />,
      id: "2",
      title: "Inscription et compte utilisateur",
      content:
        "Pour creer un compte PimPay, vous devez fournir :\n\n- Un numero de telephone ou une adresse email valide et unique.\n- Un mot de passe securise (chiffre cote serveur).\n- Un code PIN pour la validation des transactions sensibles.\n\nVotre compte peut etre lie a :\n- Un Pi User ID (piUserId) pour l'integration Pi Network.\n- Une adresse Sidra (sidraAddress) pour l'ecosysteme Sidra Chain.\n- Une adresse USDT TRC20 pour les transactions stablecoin.\n\nLes roles disponibles sont : USER, MERCHANT, AGENT, ADMIN. Chaque role dispose de privileges specifiques. Le statut de votre compte (ACTIVE, BANNED, PENDING, FROZEN, SUSPENDED) determine votre niveau d'acces au service.",
    },
    {
      icon: <ArrowRightLeft size={16} />,
      id: "3",
      title: "Transactions et operations",
      content:
        "PimPay prend en charge les types d'operations suivants : TRANSFER, WITHDRAW, DEPOSIT, PAYMENT, EXCHANGE, STAKING_REWARD, AIRDROP, CARD_PURCHASE.\n\nRegles applicables :\n- Toutes les transactions sont irrevocables une fois confirmees sur la blockchain (Pi Network ou Sidra Chain).\n- Chaque transaction possede une reference unique et peut etre tracee via son identifiant blockchain (blockchainTx).\n- Les frais de transaction sont fixes et bases sur les couts operationnels reels du reseau, sans marge d'interet (conformite Anti-Riba).\n- Les frais sont affiches de maniere claire et transparente avant chaque confirmation (conformite Anti-Gharar).\n- Le montant minimum de retrait est de 1.0 unite et le maximum est de 5,000 unites par transaction.\n- Les limites quotidiennes (par defaut 1,000) et mensuelles (par defaut 10,000) s'appliquent a chaque utilisateur.",
    },
    {
      icon: <CreditCard size={16} />,
      id: "4",
      title: "Cartes virtuelles",
      content:
        "PimPay propose 4 types de cartes virtuelles : CLASSIC, GOLD, BUSINESS et ULTRA.\n\nConditions d'utilisation :\n- Chaque carte est associee a un numero unique, une date d'expiration, un CVV et un code PIN optionnel.\n- La limite quotidienne par defaut est de 1,000 USD, ajustable selon le type de carte.\n- Les devises autorisees par defaut sont USD et XAF, configurables par l'utilisateur.\n- Le gel d'une carte (isFrozen) est instantane et peut etre effectue par l'utilisateur ou par le systeme en cas de suspicion de fraude.\n- Les depenses totales (totalSpent) sont tracees et visibles dans votre tableau de bord.\n- Les achats par carte (CARD_PURCHASE) sont debites de votre wallet principal dans la devise correspondante.",
    },
    {
      icon: <Globe size={16} />,
      id: "5",
      title: "Wallets multi-devises",
      content:
        "PimPay offre des wallets multi-devises avec les types suivants : FIAT, PI, CRYPTO, SIDRA.\n\nDevises supportees : XAF (Franc CFA), EUR (Euro), USD (Dollar US), CDF (Franc congolais), Pi (Pi Network), Sidra (Sidra Chain).\n\nRegles :\n- Chaque utilisateur peut detenir un wallet par devise (contrainte unique userId + currency).\n- Le solde gele (frozenBalance) correspond aux montants reserves pour des transactions en cours de validation.\n- Les depots sont identifies via un memo unique (depositMemo).\n- Le swap entre devises utilise le systeme SwapQuote avec un taux et une duree d'expiration pour proteger l'utilisateur.\n- Le taux de consensus PimPay (consensusPrice) est mis a jour regulierement et sert de reference pour les conversions.",
    },
    {
      icon: <Zap size={16} />,
      id: "6",
      title: "Ecosysteme Sidra Chain",
      content:
        "L'integration Sidra Chain dans PimPay est regie par les principes suivants :\n\n- La Sidra Chain est une blockchain conforme a la Charia, eliminant le Riba (interet) et le Gharar (incertitude).\n- PimPay se connecte au Sidra Chain Mainnet via le noeud RPC (node.sidrachain.com).\n- Les frais de gaz sont quasi-nuls (environ 0.0001 SDR par transaction), bases sur les couts reels de l'infrastructure.\n- Le Conseil de Surveillance Sharia (SSB) valide chaque produit financier avant sa mise en service, conformement au standard SMIIC 1:2020.\n- Les modules educatifs integres dans l'application expliquent les principes de la finance ethique aux utilisateurs.\n- Toute transaction sur la Sidra Chain est transparente et immutable par nature.",
    },
    {
      icon: <Zap size={16} />,
      id: "7",
      title: "Ecosysteme Pi Network",
      content:
        "L'integration Pi Network dans PimPay est soumise aux conditions suivantes :\n\n- L'authentification Pi utilise le SDK Pi v2.0 officiel.\n- Votre Pi User ID est lie de maniere unique a votre compte PimPay.\n- Les transferts entre Pioneers sont traites en peer-to-peer (P2P) directement dans l'application.\n- Le swap Pi vers Fiat utilise le taux de consensus PimPay avec un systeme de cotation a duree limitee.\n- Les frais de reseau Pi (0.01 Pi) sont appliques a chaque operation de retrait ou de swap.\n- PimPay ne stocke jamais votre phrase de recuperation Pi (passphrase). Ne la partagez avec personne.",
    },
    {
      icon: <Lock size={16} />,
      id: "8",
      title: "Securite du compte",
      content:
        "Vous etes responsable de la confidentialite de votre compte et de vos identifiants.\n\nMesures de securite :\n- Activez l'authentification a deux facteurs (2FA) via TOTP pour une protection maximale.\n- Definissez un code PIN robuste pour les transactions sensibles.\n- Ne partagez jamais votre mot de passe, PIN, phrase de recuperation Pi ou cle privee Sidra.\n- PimPay ne vous demandera jamais ces informations par email, SMS ou message direct.\n- En cas de suspicion de compromission, gelez immediatement votre compte via les parametres ou le support.\n- Les tentatives de connexion echouees sont tracees et un gel automatique peut etre declenche.",
    },
    {
      icon: <Landmark size={16} />,
      id: "9",
      title: "Staking et epargne",
      content:
        "PimPay propose un service de staking avec les conditions suivantes :\n\n- Le montant stake est bloque pour une duree determinee (startDate a endDate).\n- Le taux APY (stakingAPY) est defini dans la configuration systeme et peut etre ajuste.\n- Les recompenses accumulees (rewardsEarned) sont de type STAKING_REWARD et creditees selon les conditions du programme.\n- L'annulation anticipee du staking peut entrainer la perte partielle des recompenses.\n- Le staking PimPay ne genere pas d'interet usuraire : les rendements sont bases sur la participation au reseau, conformement aux principes de la Moudaraba islamique.",
    },
    {
      icon: <Ban size={16} />,
      id: "10",
      title: "Comportements interdits",
      content:
        "Les comportements suivants sont strictement interdits et entraineront la suspension ou le bannissement du compte :\n\n- Toute tentative d'exploitation frauduleuse des taux de change ou du protocole de swap.\n- L'utilisation de comptes multiples pour contourner les limites de transaction.\n- Le blanchiment d'argent ou le financement d'activites illicites.\n- L'usurpation d'identite ou la soumission de documents KYC falsifies.\n- Toute tentative d'attaque contre l'infrastructure PimPay (DDoS, injection SQL, etc.).\n- Le partage de votre compte avec des tiers.\n- L'utilisation de VPN pour contourner les geo-restrictions.",
    },
    {
      icon: <AlertTriangle size={16} />,
      id: "11",
      title: "Limitation de responsabilite",
      content:
        "PimPay ne pourra etre tenu responsable :\n\n- Des pertes resultant de la volatilite du marche des actifs numeriques (Pi, Sidra, Bitcoin, USDT).\n- Des erreurs de saisie de l'utilisateur lors des transferts (adresse de wallet incorrecte, montant errone).\n- Des interruptions de service dues a la maintenance du Sidra Chain Mainnet ou du reseau Pi.\n- Des consequences liees a la perte de vos identifiants, code PIN ou cles privees.\n- Des decisions d'investissement prises par l'utilisateur sur la base des informations affichees.\n- Des retards de traitement imputables aux reseaux blockchain sous-jacents.",
    },
    {
      icon: <Globe size={16} />,
      id: "12",
      title: "Juridiction et conformite",
      content:
        "PimPay opere sous le cadre reglementaire suivant :\n\n- Modele Banking-as-a-Service (BaaS) utilisant des licences d'institutions financieres partenaires.\n- Conformite avec les standards AAOIFI pour la finance islamique.\n- Conformite avec les standards SMIIC (1:2020 pour la gouvernance, 8:2022 pour la protection des donnees).\n- Application des principes Basel III pour le suivi des ratios de liquidite.\n- Geo-restriction par IP et geolocalisation pour respecter les lois bancaires de chaque juridiction.\n- En cas de litige, le droit applicable est celui du siege social de PimPay.",
    },
    {
      icon: <Gavel size={16} />,
      id: "13",
      title: "Modifications et resiliation",
      content:
        "PimPay se reserve le droit de :\n\n- Modifier les presentes conditions a tout moment. Les utilisateurs seront notifies via le systeme de notifications in-app.\n- Suspendre ou cloturer un compte en cas de violation des conditions d'utilisation.\n- Ajuster les frais de transaction, les limites et les taux de swap avec un preavis raisonnable.\n- Mettre le service en mode maintenance (maintenanceMode) lorsque necessaire.\n\nL'utilisateur peut cloturer son compte a tout moment en contactant le support. Les fonds restants seront transferes selon les modalites en vigueur.",
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
            PimPay <span className="text-blue-500">Terms</span>
          </h1>
          <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 border border-white/10">
            <ScrollText size={18} />
          </div>
        </div>

        {/* Banner */}
        <div className="mb-8 p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-4 backdrop-blur-sm">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
              Derniere mise a jour
            </p>
            <p className="text-xs font-bold text-white">Fevrier 2026</p>
          </div>
        </div>

        {/* Scope */}
        <div className="mb-8 grid grid-cols-3 gap-2">
          {[
            { label: "13 Articles", sub: "Complet" },
            { label: "Multi-Chain", sub: "Pi + Sidra" },
            { label: "Conforme", sub: "SMIIC/AAOIFI" },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-center"
            >
              <p className="text-xs font-bold text-white">{stat.label}</p>
              <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5">
                {stat.sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="px-6 space-y-3">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden"
          >
            <button
              onClick={() =>
                setOpenSection(openSection === index ? null : index)
              }
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              <span className="text-blue-500 shrink-0">{section.icon}</span>
              <h2 className="text-xs font-bold flex-1">
                {section.id}. {section.title}
              </h2>
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

      {/* Contact juridique */}
      <div className="px-6 mt-8">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-center">
          <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-blue-500 mb-4">
            Service Juridique
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Mail size={14} className="text-slate-500" />
              <p className="text-xs text-slate-300 font-bold">
                juridique@pimpay.pi
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Phone size={14} className="text-slate-500" />
              <p className="text-xs text-slate-300 font-bold">
                +242 065 540 305
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center px-6">
        <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">
          PimPay Protocol Compliance Office
        </p>
        <p className="text-[8px] text-slate-800 mt-1">
          Sidra Chain + Pi Network - Finance Ethique Conforme
        </p>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
