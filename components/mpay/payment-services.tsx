"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  CreditCard, Store, Zap, Droplets, Tv, Wifi, Smartphone,
  Plane, TrainFront, Hotel, UtensilsCrossed, Car, SquareParking,
  GraduationCap, HeartPulse, Landmark, Gamepad2, Gift, Globe,
  ShoppingCart, Banknote, QrCode, Search, Star, LayoutGrid,
  ChevronRight, X, HandCoins, ArrowUpRight, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TapToPhoneTerminal } from "@/components/mpay/tap-to-phone-terminal";

interface PaymentService {
  id: string;
  name: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  gradient: string;
  glow: string;
  isNew?: boolean;
  route?: string;
  /** Ouvre le terminal Tap to Phone en overlay (au lieu de naviguer) */
  opensTerminal?: boolean;
}

interface ShoppingMarketplace {
  id: string;
  name: string;
  description: string;
  logo: string;
  href: string;
  accent: string;
}

const SHOPPING_MARKETPLACES: ShoppingMarketplace[] = [
  { id: "amazon", name: "Amazon", description: "Livres, maison et électronique", logo: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/amazon/default.svg", href: "https://www.amazon.com", accent: "from-amber-400/20 to-orange-500/5" },
  { id: "ebay", name: "eBay", description: "Enchères et bonnes affaires", logo: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/ebay/default.svg", href: "https://www.ebay.com", accent: "from-blue-500/20 to-red-500/5" },
  { id: "alibaba", name: "Alibaba", description: "Achats en gros et fournisseurs", logo: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/alibaba/default.svg", href: "https://www.alibaba.com", accent: "from-orange-500/20 to-red-500/5" },
  { id: "aliexpress", name: "AliExpress", description: "Shopping international", logo: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/aliexpress/default.svg", href: "https://www.aliexpress.com", accent: "from-red-500/20 to-orange-500/5" },
  { id: "temu", name: "Temu", description: "Découvertes à petits prix", logo: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/temu/default.svg", href: "https://www.temu.com", accent: "from-orange-400/20 to-pink-500/5" },
  { id: "shein", name: "SHEIN", description: "Mode et tendances", logo: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/shein/default.svg", href: "https://www.shein.com", accent: "from-pink-500/20 to-violet-500/5" },
  { id: "walmart", name: "Walmart", description: "Courses et produits du quotidien", logo: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/walmart/default.svg", href: "https://www.walmart.com", accent: "from-blue-500/20 to-cyan-500/5" },
];

// Full catalog of PIMOBIPAY payment services (Premium Dark)
const SERVICES: PaymentService[] = [
  { id: "payment-request", name: "Demande de paiement", description: "Reclamez un paiement via lien ou QR code", features: ["Lien partageable", "QR code", "Expiration automatique", "Suivi des demandes"], icon: HandCoins, gradient: "from-emerald-600 to-teal-700", glow: "shadow-emerald-600/30", isNew: true, route: "/mpay/request" },
  { id: "visa-contactless", name: "Visa Tap to Phone", description: "Encaisser une carte Visa sans contact", features: ["Tap to Phone", "Encaissement NFC", "Crédit wallet PIMOBIPAY", "Reçu instantané"], icon: CreditCard, gradient: "from-blue-600 to-indigo-700", glow: "shadow-blue-600/30", isNew: true, opensTerminal: true },
  { id: "pos", name: "POS Payment", description: "Paiement chez les commerçants", features: ["Scanner un QR POS", "Bluetooth terminal POS", "Paiement NFC", "Merchant ID manuel"], icon: Store, gradient: "from-indigo-600 to-violet-700", glow: "shadow-indigo-600/30" },
  { id: "electricity", name: "Electricity", description: "Paiement d'électricité", features: ["Choisir le fournisseur", "Numéro compteur", "Nom du client", "Paiement instantané", "Historique"], icon: Zap, gradient: "from-amber-500 to-orange-600", glow: "shadow-amber-500/30" },
  { id: "water", name: "Water", description: "Paiement facture d'eau", features: ["Choisir compagnie", "Numéro client", "Affichage montant", "Paiement"], icon: Droplets, gradient: "from-sky-500 to-cyan-600", glow: "shadow-sky-500/30" },
  { id: "tv", name: "TV Subscriptions", description: "Gérez vos abonnements TV en toute sécurité", features: ["Canal+", "DSTV", "StarTimes", "Vérification compte"], icon: Tv, gradient: "from-rose-500 to-red-600", glow: "shadow-rose-500/30", route: "/mpay/tv" },
  { id: "internet", name: "Internet", description: "Orange, MTN, Airtel, Moov, Vodacom", features: ["Orange", "MTN", "Airtel", "Moov", "Vodacom"], icon: Wifi, gradient: "from-teal-500 to-emerald-600", glow: "shadow-teal-500/30" },
  { id: "mobile-money", name: "Mobile Money", description: "Recharge portefeuille Mobile Money", features: ["Orange Money", "MTN Mobile Money", "Airtel Money", "Moov Money", "M-Pesa"], icon: Smartphone, gradient: "from-orange-500 to-amber-600", glow: "shadow-orange-500/30" },
  { id: "flight", name: "Flight Tickets", description: "Search and book flights worldwide", features: ["Departure", "Destination", "Dates", "Passengers", "Filters", "Price options"], icon: Plane, gradient: "from-blue-500 to-sky-600", glow: "shadow-blue-500/30", isNew: true, route: "/mpay/flights" },
  { id: "train-bus", name: "Train / Bus", description: "Réservation transport terrestre", features: ["Paiement", "QR Ticket", "Historique"], icon: TrainFront, gradient: "from-cyan-500 to-blue-600", glow: "shadow-cyan-500/30" },
  { id: "hotels", name: "Hotels", description: "Réservation hôtel autour de vous", features: ["Carte", "Géolocalisation", "Recherche", "Paiement", "Confirmation"], icon: Hotel, gradient: "from-fuchsia-500 to-pink-600", glow: "shadow-fuchsia-500/30", isNew: true, route: "/mpay/hotels" },
  { id: "food", name: "Food Delivery", description: "Commander un repas", features: ["Restaurants", "Paiement", "Livraison"], icon: UtensilsCrossed, gradient: "from-red-500 to-rose-600", glow: "shadow-red-500/30" },
  { id: "taxi", name: "Taxi", description: "Commander un taxi", features: ["Carte", "Position GPS", "Paiement automatique", "Historique"], icon: Car, gradient: "from-yellow-500 to-amber-600", glow: "shadow-yellow-500/30" },
  { id: "parking", name: "Parking", description: "Paiement parking", features: ["Scanner QR", "Durée", "Paiement"], icon: SquareParking, gradient: "from-slate-500 to-slate-600", glow: "shadow-slate-500/30" },
  { id: "school", name: "School Fees", description: "Paiement frais scolaires", features: ["Université", "Numéro étudiant", "Montant", "Paiement"], icon: GraduationCap, gradient: "from-indigo-500 to-blue-600", glow: "shadow-indigo-500/30" },
  { id: "hospital", name: "Hospital Bills", description: "Paiement hôpital", features: ["Recherche dossier", "Paiement", "Téléchargement reçu"], icon: HeartPulse, gradient: "from-rose-500 to-red-600", glow: "shadow-rose-500/30" },
  { id: "government", name: "Government Services", description: "Passeport, Visa, Impôts, Permis, Taxes", features: ["Passeport", "Visa", "Impôts", "Permis", "Taxes"], icon: Landmark, gradient: "from-emerald-600 to-teal-700", glow: "shadow-emerald-600/30" },
  { id: "gaming", name: "Gaming", description: "Free Fire, PUBG, Steam, PlayStation", features: ["Free Fire", "PUBG", "Steam", "PlayStation", "Xbox", "Nintendo"], icon: Gamepad2, gradient: "from-violet-600 to-purple-700", glow: "shadow-violet-600/30", isNew: true },
  { id: "gift-cards", name: "Gift Cards", description: "Google Play, Apple, Amazon, Netflix", features: ["Google Play", "Apple", "Amazon", "Netflix", "Steam"], icon: Gift, gradient: "from-pink-500 to-rose-600", glow: "shadow-pink-500/30" },
  { id: "international", name: "International Transfers", description: "Envoyer de l'argent à l'international", features: ["Visa Direct", "Mastercard Send", "SWIFT", "Stablecoins", "Pi / USDT / USDC"], icon: Globe, gradient: "from-cyan-600 to-blue-700", glow: "shadow-cyan-600/30", isNew: true },
  { id: "shopping", name: "Online Shopping", description: "Amazon, Alibaba, Temu, AliExpress, eBay", features: ["Amazon", "Alibaba", "Temu", "AliExpress", "eBay"], icon: ShoppingCart, gradient: "from-orange-500 to-red-600", glow: "shadow-orange-500/30" },
  { id: "cash", name: "Cash In / Cash Out", description: "Dépôt & retrait espèces via Agents PIMOBIPAY", features: ["Dépôt espèces", "Retrait espèces", "Agents PIMOBIPAY"], icon: Banknote, gradient: "from-green-500 to-emerald-600", glow: "shadow-green-500/30" },
  { id: "merchant", name: "Merchant Payment", description: "Paiement commerçant", features: ["QR Code", "Merchant ID", "NFC", "POS"], icon: QrCode, gradient: "from-blue-600 to-cyan-700", glow: "shadow-blue-600/30" },
];

const SUPPORTED_PAYMENTS = [
  "Pi", "USDT", "USDC", "USD", "EUR", "XAF", "XOF", "BTC", "ETH",
  "BNB", "TRX", "Solana", "Visa", "Mastercard", "Bank", "Mobile Money",
];

const FAVORITES_KEY = "pimpay_service_favorites";

export function PaymentServices() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [tapped, setTapped] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showTapTerminal, setShowTapTerminal] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? SERVICES.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.features.some((f) => f.toLowerCase().includes(q))
        )
      : SERVICES;
    // Favorites first
    return [...list].sort((a, b) => {
      const af = favorites.includes(a.id) ? 1 : 0;
      const bf = favorites.includes(b.id) ? 1 : 0;
      return bf - af;
    });
  }, [search, favorites]);

  const visible = showAll || search ? filtered : filtered.slice(0, 8);

  const handleTap = (service: PaymentService) => {
    setTapped(service.id);
    setTimeout(() => setTapped(null), 250);
    if (service.opensTerminal) {
      setShowTapTerminal(true);
      return;
    }
    if (service.route) {
      router.push(service.route);
      return;
    }
    toast.success(service.name, {
      description: `${service.description} — Bientôt disponible sur PIMOBIPAY`,
      duration: 3000,
    });
  };

  return (
    <section aria-labelledby="payment-services-heading">
      {/* Online shopping hub */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ShoppingCart size={15} className="text-orange-400" />
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-300">Shopping en ligne</p>
            </div>
            <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">Payez vos achats avec MPay</h2>
            <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-slate-400 sm:text-[11px]">
              Retrouvez vos marketplaces préférées et utilisez votre solde MPay pour régler vos achats en toute simplicité.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-orange-200">
            Hub MPay
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {SHOPPING_MARKETPLACES.map((marketplace) => (
            <a
              key={marketplace.id}
              href={marketplace.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ouvrir ${marketplace.name} dans un nouvel onglet`}
              className={`group relative flex min-h-32 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${marketplace.accent} p-3 transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex size-11 items-center justify-center rounded-xl bg-white p-2 shadow-lg shadow-black/20">
                  <img
                    src={marketplace.logo}
                    alt={`Logo ${marketplace.name}`}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                  />
                </div>
                <ArrowUpRight size={13} className="text-slate-500 transition-colors group-hover:text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-black text-white">{marketplace.name}</p>
                <p className="mt-1 line-clamp-2 text-[8px] leading-relaxed text-slate-400">{marketplace.description}</p>
              </div>
            </a>
          ))}
        </div>
        <p className="mt-3 text-[8px] font-medium text-slate-600">
          Vous serez redirigé vers le site officiel de chaque marketplace. Les marques et logos appartiennent à leurs propriétaires respectifs.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LayoutGrid size={14} className="text-blue-500" />
          <h2 id="payment-services-heading" className="text-xs font-black uppercase tracking-widest text-slate-300">
            Payment Services
          </h2>
        </div>
        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
          {SERVICES.length} services
        </span>
      </div>

      {/* Quick search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un service…"
          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-11 pr-10 text-[11px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.05] transition-all"
          aria-label="Rechercher un service de paiement"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
            aria-label="Effacer la recherche"
          >
            <X size={12} className="text-slate-400" />
          </button>
        )}
      </div>

      {/* Services grid */}
      {visible.length === 0 ? (
        <div className="text-center py-8">
          <Search size={32} className="mx-auto text-slate-600 mb-2" />
          <p className="text-[10px] font-bold text-slate-500 uppercase">Aucun service trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {visible.map((service) => {
            const isFav = favorites.includes(service.id);
            const isTapped = tapped === service.id;
            return (
              <div key={service.id} className="relative group">
                {/* Ambient glow */}
                <div
                  className={`absolute -inset-0.5 bg-gradient-to-br ${service.gradient} rounded-2xl blur-md opacity-0 group-hover:opacity-30 transition-opacity duration-300`}
                  aria-hidden="true"
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleTap(service)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleTap(service);
                    }
                  }}
                  aria-label={service.name}
                  className={`relative w-full h-full bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 flex flex-col items-start gap-2.5 text-left cursor-pointer hover:bg-white/[0.06] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all duration-200 ${
                    isTapped ? "scale-95" : "active:scale-95"
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div
                      className={`w-11 h-11 bg-gradient-to-br ${service.gradient} rounded-xl flex items-center justify-center shadow-lg ${service.glow}`}
                    >
                      <service.icon size={20} className="text-white" />
                    </div>
                    <div className="flex items-center gap-1">
                      {service.isNew && (
                        <span className="text-[7px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                          New
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(service.id);
                        }}
                        className="p-1 rounded-lg hover:bg-white/10 transition-all"
                        aria-label={isFav ? `Retirer ${service.name} des favoris` : `Ajouter ${service.name} aux favoris`}
                        aria-pressed={isFav}
                      >
                        <Star
                          size={12}
                          className={isFav ? "text-amber-400 fill-amber-400" : "text-slate-600"}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="w-full">
                    <p className="text-[11px] font-black tracking-tight text-white leading-tight text-balance">
                      {service.name}
                    </p>
                    <p className="text-[8px] font-medium text-slate-500 leading-relaxed mt-1 line-clamp-2">
                      {service.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show more / less */}
      {!search && filtered.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black text-slate-400 uppercase tracking-wider hover:bg-white/10 transition-all flex items-center justify-center gap-2"
        >
          {showAll ? (
            <>Voir moins <ChevronRight size={12} className="rotate-[-90deg]" /></>
          ) : (
            <>Voir tous les services ({filtered.length}) <ChevronRight size={12} className="rotate-90" /></>
          )}
        </button>
      )}

      {/* Supported payments strip */}
      <div className="mt-5 bg-white/[0.02] border border-white/10 rounded-2xl p-4">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-3">
          Paiements supportés
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUPPORTED_PAYMENTS.map((p) => (
            <span
              key={p}
              className="text-[8px] font-bold text-slate-300 bg-white/[0.04] border border-white/10 px-2 py-1 rounded-lg"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Terminal Tap to Phone en overlay */}
      {showTapTerminal && (
        <TapToPhoneTerminal onClose={() => setShowTapTerminal(false)} />
      )}
    </section>
  );
}
