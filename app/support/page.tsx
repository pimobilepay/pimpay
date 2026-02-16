"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, Search, MessageSquare, Mail,
  ChevronRight, ChevronDown, HelpCircle, ShieldCheck,
  Wallet, RefreshCcw, ExternalLink, CreditCard,
  Globe, Zap, Lock, Users, BookOpen,
  Phone, AlertTriangle, CheckCircle2, Landmark,
  ArrowRightLeft, Fingerprint, FileText
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

export default function HelpPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const categories = [
    {
      icon: <Wallet size={20} />,
      title: "Compte & Wallet",
      desc: "Gestion des soldes, devises et KYC",
      id: "wallet",
      details: [
        "PimPay prend en charge les wallets multi-devises : XAF, EUR, USD, CDF, Pi et Sidra.",
        "Chaque wallet est associe a une devise unique par utilisateur (contrainte userId + currency).",
        "Le solde gele (frozenBalance) est reserve pour les transactions en attente de confirmation.",
        "Les depots sont traces via un memo unique (depositMemo) pour chaque wallet.",
        "La verification KYC est requise pour les transactions superieures a 500 USD equivalent.",
      ],
    },
    {
      icon: <RefreshCcw size={20} />,
      title: "Transactions & Swap",
      desc: "Suivi des transferts, swaps et historique",
      id: "transactions",
      details: [
        "Les types de transactions supportes : TRANSFER, WITHDRAW, DEPOSIT, PAYMENT, EXCHANGE, STAKING_REWARD, AIRDROP, CARD_PURCHASE.",
        "Chaque transaction possede une reference unique et un identifiant blockchain optionnel (blockchainTx).",
        "Les frais de transaction sont calcules de maniere transparente (Anti-Gharar) bases sur les couts reels du reseau.",
        "Le swap utilise un systeme de cotation (SwapQuote) avec un taux et une expiration pour proteger l'utilisateur.",
        "Les statuts possibles : PENDING, COMPLETED, SUCCESS, FAILED, CANCELLED.",
      ],
    },
    {
      icon: <ShieldCheck size={20} />,
      title: "Securite & Protection",
      desc: "Authentification, sessions et journaux",
      id: "security",
      details: [
        "Authentification a deux facteurs (2FA) disponible via TOTP pour securiser votre compte.",
        "Chaque session est tracee avec IP, appareil, navigateur et geolocalisation (ville, pays).",
        "Un code PIN secondaire protege les transactions sensibles (retraits, transferts importants).",
        "Les tentatives de connexion echouees sont comptabilisees et le compte peut etre gele apres plusieurs echecs.",
        "Journal de securite complet (SecurityLog) pour chaque action sensible effectuee sur votre compte.",
      ],
    },
    {
      icon: <CreditCard size={20} />,
      title: "Cartes Virtuelles",
      desc: "Gestion des cartes VISA virtuelles",
      id: "cards",
      details: [
        "4 types de cartes disponibles : CLASSIC, GOLD, BUSINESS et ULTRA avec des limites differentes.",
        "Chaque carte possede un numero unique, une date d'expiration, un CVV et un code PIN.",
        "Possibilite de geler/degeler une carte instantanement en cas de suspicion de fraude.",
        "Limite quotidienne configurable (par defaut 1,000 USD) et suivi des depenses totales.",
        "Devises autorisees configurables par carte (par defaut USD et XAF).",
      ],
    },
    {
      icon: <Globe size={20} />,
      title: "Sidra Chain",
      desc: "Blockchain conforme a la Charia",
      id: "sidra",
      details: [
        "La Sidra Chain est une blockchain conforme aux principes de la finance islamique (elimination du Riba et du Gharar).",
        "PimPay est connecte au Sidra Chain Mainnet via un noeud RPC (node.sidrachain.com).",
        "Les frais de gaz sur la Sidra Chain sont quasi-nuls (environ 0.0001 SDR par transaction).",
        "Chaque utilisateur peut avoir une adresse Sidra unique avec cle privee chiffree.",
        "Les wallets de type SIDRA permettent de stocker et echanger des tokens Sidra directement dans PimPay.",
        "La conformite Sharia est assuree par un Conseil de Surveillance (SSB) selon le standard SMIIC 1:2020.",
      ],
    },
    {
      icon: <Zap size={20} />,
      title: "Pi Network",
      desc: "Ecosysteme Pi et integration SDK",
      id: "pi",
      details: [
        "PimPay est integre a l'ecosysteme Pi Network via le SDK Pi v2.0 pour l'authentification et les paiements.",
        "Chaque utilisateur peut lier son Pi User ID (piUserId) a son compte PimPay.",
        "Les wallets de type PI permettent de gerer votre solde Pi directement depuis l'application.",
        "Le swap Pi vers Fiat (XAF, EUR, USD) utilise le taux de consensus PimPay mis a jour en temps reel.",
        "Les frais de reseau Pi (0.01 Pi) sont appliques a chaque operation de retrait ou de swap.",
        "L'integration P2P permet les transferts entre Pioneers directement dans PimPay.",
      ],
    },
  ];

  const faqs = [
    {
      q: "Comment fonctionne le swap Pi/Fiat ?",
      a: "Le swap utilise le systeme de cotation SwapQuote de PimPay. Un taux est calcule en temps reel base sur le consensusPrice (actuellement 314,159 XAF/Pi). La cotation a une duree d'expiration pour vous proteger de la volatilite. Une fois confirme, le montant est debite de votre wallet Pi et credite sur votre wallet Fiat (XAF, EUR ou USD) apres deduction des frais.",
    },
    {
      q: "Quels sont les delais de retrait ?",
      a: "Les retraits vers vos comptes locaux (Mobile Money, virement bancaire) sont generalement traites en moins de 15 minutes. Le montant minimum de retrait est de 1.0 unite et le maximum est de 5,000 unites par transaction. Des frais de 0.01 sont appliques sur chaque retrait.",
    },
    {
      q: "Pourquoi mon KYC est-il en attente ?",
      a: "Le processus KYC comprend la verification de votre piece d'identite (recto/verso) et un selfie. Les statuts possibles sont : NONE, PENDING, VERIFIED, REJECTED, APPROVED. La validation peut prendre jusqu'a 24h. Assurez-vous que vos documents (kycFrontUrl, kycBackUrl, kycSelfieUrl) sont lisibles et a jour.",
    },
    {
      q: "Comment fonctionne la Sidra Chain dans PimPay ?",
      a: "PimPay se connecte au Sidra Chain Mainnet via un noeud RPC. Votre adresse Sidra (sidraAddress) est unique et liee a votre compte. Les transactions Sidra sont conformes a la Charia : pas de Riba (interet), transparence totale des frais (Anti-Gharar), et validation par le Conseil de Surveillance Sharia (SSB) selon le SMIIC 1:2020.",
    },
    {
      q: "Comment generer une carte virtuelle ?",
      a: "Rendez-vous dans la section Cartes et selectionnez le type de carte souhaite (CLASSIC, GOLD, BUSINESS, ULTRA). La carte est generee instantanement avec un numero unique, une date d'expiration et un CVV. Vous pouvez definir un code PIN, ajuster la limite quotidienne et configurer les devises autorisees.",
    },
    {
      q: "Qu'est-ce que le Staking PimPay ?",
      a: "Le staking vous permet de bloquer un montant de tokens pour une duree determinee et de recevoir des recompenses (STAKING_REWARD). Le taux APY est configure dans le systeme (stakingAPY). Les recompenses accumulees (rewardsEarned) sont ajoutees a votre solde a la fin de la periode de staking.",
    },
    {
      q: "Comment contacter le support ?",
      a: "Vous pouvez creer un ticket de support directement depuis l'application. Chaque ticket a un sujet, une priorite (LOW, MEDIUM, HIGH) et un statut (OPEN, IN_PROGRESS, CLOSED). Les messages sont echanges dans un fil de discussion associe au ticket.",
    },
    {
      q: "Mes fonds sont-ils en securite ?",
      a: "Oui. PimPay utilise un chiffrement AES-256 pour les donnees au repos et TLS 1.3 en transit. Les cles privees (Sidra, USDT) sont chiffrees cote serveur. L'authentification 2FA, le code PIN transactionnel et le suivi des sessions ajoutent des couches de protection supplementaires. Un journal d'audit complet trace chaque action administrative.",
    },
    {
      q: "Quelles devises sont supportees ?",
      a: "PimPay supporte les wallets multi-devises : XAF (Franc CFA), EUR (Euro), USD (Dollar), CDF (Franc congolais), Pi (Pi Network) et Sidra (Sidra Chain). Les types de wallet sont FIAT, PI, CRYPTO et SIDRA. Chaque utilisateur peut avoir un wallet par devise.",
    },
    {
      q: "Comment fonctionne le systeme de parrainage ?",
      a: "Chaque utilisateur recoit un code de parrainage unique (referralCode). Lorsqu'un nouvel utilisateur s'inscrit avec votre code, il est lie a votre compte via le systeme de referrals. Les avantages du parrainage sont definis par les promotions en cours.",
    },
  ];

  const filteredFaqs = searchQuery
    ? faqs.filter(
        (f) =>
          f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  const filteredCategories = searchQuery
    ? categories.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.details.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : categories;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* Header */}
      <div className="p-6 pt-8">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.back()}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">
            {"Centre d'"}<span className="text-blue-500">Aide</span>
          </h1>
          <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 border border-white/10">
            <HelpCircle size={18} />
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Rechercher une question, un sujet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-blue-500/50 transition-all text-sm text-white placeholder:text-slate-600"
          />
        </div>

        {/* Quick Stats Banner */}
        <div className="mb-8 p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-4 backdrop-blur-sm">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 text-white">
            <BookOpen size={20} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
              Base de connaissances
            </p>
            <p className="text-xs font-bold text-white mt-0.5">
              {categories.length} categories - {faqs.length} questions frequentes
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Landmark size={14} className="text-blue-500" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
            Categories de Support
          </h2>
        </div>

        <div className="space-y-3">
          {filteredCategories.map((cat) => (
            <div key={cat.id}>
              <button
                onClick={() =>
                  setActiveCategory(activeCategory === cat.id ? null : cat.id)
                }
                className="w-full group bg-slate-900/60 border border-white/5 p-4 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-11 h-11 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold">{cat.title}</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">
                    {cat.desc}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-600 transition-transform ${
                    activeCategory === cat.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {activeCategory === cat.id && (
                <div className="mt-2 ml-4 border-l border-blue-500/20 pl-4 space-y-2 pb-2">
                  {cat.details.map((detail, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2
                        size={12}
                        className="text-blue-500 mt-1 shrink-0"
                      />
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {detail}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Blockchain Info Cards */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Globe size={14} className="text-blue-500" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
            Ecosystemes Integres
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4">
            <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-3">
              <ShieldCheck size={18} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-emerald-300 mb-1">Sidra Chain</h3>
            <p className="text-[10px] text-emerald-400/70 leading-relaxed">
              Blockchain conforme Charia. Frais quasi-nuls. Standard SMIIC/AAOIFI.
            </p>
          </div>
          <div className="bg-gradient-to-br from-amber-900/30 to-amber-950/20 border border-amber-500/20 rounded-2xl p-4">
            <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center mb-3">
              <Zap size={18} className="text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-amber-300 mb-1">Pi Network</h3>
            <p className="text-[10px] text-amber-400/70 leading-relaxed">
              SDK v2.0 integre. Swap P2P instantane. Transferts entre Pioneers.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <HelpCircle size={14} className="text-blue-500" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
            Questions Frequentes ({filteredFaqs.length})
          </h2>
        </div>

        <div className="space-y-3">
          {filteredFaqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <h4 className="text-sm font-bold pr-4">{faq.q}</h4>
                <ChevronDown
                  size={16}
                  className={`text-slate-600 shrink-0 transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Useful Links */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <FileText size={14} className="text-blue-500" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
            Liens Utiles
          </h2>
        </div>

        <div className="space-y-2">
          {[
            { label: "Politique de Confidentialite", href: "/legal/privacy", icon: <Lock size={16} /> },
            { label: "Conditions d'Utilisation", href: "/legal/terms", icon: <FileText size={16} /> },
            { label: "Gouvernance Sharia (SMIIC)", href: "#", icon: <ShieldCheck size={16} /> },
            { label: "Architecture Technique", href: "#", icon: <Zap size={16} /> },
          ].map((link, i) => (
            <button
              key={i}
              onClick={() => link.href !== "#" && router.push(link.href)}
              className="w-full bg-slate-900/40 border border-white/5 rounded-xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition-all"
            >
              <span className="text-blue-500">{link.icon}</span>
              <span className="text-xs font-bold flex-1 text-left">
                {link.label}
              </span>
              <ChevronRight size={14} className="text-slate-700" />
            </button>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Phone size={14} className="text-blue-500" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
            Contacter le Support
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="bg-blue-600 p-5 rounded-2xl flex flex-col items-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
            <MessageSquare size={22} />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              Live Chat
            </span>
          </button>
          <button className="bg-slate-900 border border-white/10 p-5 rounded-2xl flex flex-col items-center gap-3 active:scale-95 transition-all">
            <Mail size={22} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Email
            </span>
          </button>
        </div>

        <div className="mt-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center space-y-2">
          <p className="text-xs text-slate-300 font-bold">support@pimpay.pi</p>
          <p className="text-xs text-slate-300 font-bold">+242 065 540 305</p>
          <p className="text-[10px] text-slate-600">
            Disponible 7j/7, de 8h a 22h (GMT+1)
          </p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="px-6 mb-8">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-amber-300 mb-1">
              Avertissement de securite
            </h3>
            <p className="text-[10px] text-amber-400/70 leading-relaxed">
              PimPay ne vous demandera jamais votre phrase de recuperation Pi, votre cle privee Sidra ou votre code PIN par email ou message direct. Signalez toute tentative suspecte au support.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 text-center pb-10">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2">
          PimPay Protocol <ExternalLink size={10} /> v2.4.0
        </p>
        <p className="text-[8px] text-slate-700 mt-1">
          Sidra Chain + Pi Network - Finance Ethique
        </p>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
