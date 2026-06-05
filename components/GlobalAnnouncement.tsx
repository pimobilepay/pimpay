"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, WifiOff, ExternalLink } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type AnnouncementType = "info" | "warning" | "success" | "urgent";

interface AnnouncementConfig {
  message: string;
  type?: AnnouncementType;
  link?: string;
  image?: string;
  dismissible?: boolean;
}

// ─── Couleurs par type (harmonie avec la palette émeraude PimPay) ─────────────
const TYPE_STYLES: Record<AnnouncementType, {
  bg: string;
  border: string;
  badge: string;
  dot: string;
  glow: string;
  label: string;
}> = {
  info: {
    bg: "from-[#0a1628] via-[#0d1f38] to-[#0a1628]",
    border: "border-blue-500/20",
    badge: "bg-blue-600/20 text-blue-300 border-blue-500/30",
    dot: "bg-blue-400",
    glow: "rgba(59,130,246,0.3)",
    label: "INFO",
  },
  warning: {
    bg: "from-[#1a1200] via-[#1f1600] to-[#1a1200]",
    border: "border-amber-500/20",
    badge: "bg-amber-600/20 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
    glow: "rgba(245,158,11,0.3)",
    label: "ALERTE",
  },
  success: {
    bg: "from-[#021a0e] via-[#03211100] to-[#021a0e]",
    border: "border-emerald-500/20",
    badge: "bg-emerald-600/20 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
    glow: "rgba(16,185,129,0.3)",
    label: "RÉSEAU",
  },
  urgent: {
    bg: "from-[#1a0000] via-[#200505] to-[#1a0000]",
    border: "border-red-500/20",
    badge: "bg-red-600/20 text-red-300 border-red-500/30",
    dot: "bg-red-400",
    glow: "rgba(239,68,68,0.3)",
    label: "URGENT",
  },
};

// ─── Fallback messages selon l'état réseau ───────────────────────────────────
const FALLBACK_MESSAGES: AnnouncementConfig[] = [
  {
    message: "Bienvenue sur PimPay — Réseau opérationnel · Transactions sécurisées 24h/24",
    type: "success",
  },
];

// ─── Composant principal ──────────────────────────────────────────────────────
export default function GlobalAnnouncement() {
  const [announcements, setAnnouncements] = useState<AnnouncementConfig[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hasAnnouncement, setHasAnnouncement] = useState(false);

  const textRef = useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const current = announcements[currentIndex] ?? announcements[0];
  const style = TYPE_STYLES[current?.type ?? "success"];

  // ─── Fetch config ──────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);

    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/admin/config", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        
        const msg: string = (data?.globalAnnouncement ?? "").trim();
        const image: string = (data?.announcementImage ?? "").trim();
        const link: string = (data?.announcementLink ?? "").trim();

        // ✅ FIX: Afficher l'annonce si un message OU une image est defini par l'admin
        if (msg !== "" || image !== "") {
          // Détecter le type selon le contenu
          let type: AnnouncementType = "info";
          if (/urgent|alerte|attention|important/i.test(msg)) type = "urgent";
          else if (/maintenance|fermeture|interruption/i.test(msg)) type = "warning";
          else if (/opérationnel|bienvenue|félicitation|succès/i.test(msg)) type = "success";

          setAnnouncements([
            {
              message: msg || "Nouvelle annonce PimPay",
              type,
              link: link || undefined,
              image: image || undefined,
            },
          ]);
          setHasAnnouncement(true);
        } else {
          // Pas d'annonce definie par l'admin
          setAnnouncements([]);
          setHasAnnouncement(false);
        }
      } catch {
        // Fail silencieux — pas d'annonce
        setHasAnnouncement(false);
      }
    };

    fetchConfig();

    // Intervalle de rafraîchissement toutes les 5 minutes
    const refresh = setInterval(fetchConfig, 5 * 60 * 1000);
    return () => clearInterval(refresh);
  }, []);

  // ─── Réseau online/offline ─────────────────────────────────────────────────
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ─── Rotation automatique entre annonces ──────────────────────────────────
  const goNext = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex(i => (i + 1) % announcements.length);
      setTextWidth(0);
      setIsVisible(true);
    }, 300);
  }, [announcements.length]);

  const goPrev = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex(i => (i - 1 + announcements.length) % announcements.length);
      setTextWidth(0);
      setIsVisible(true);
    }, 300);
  }, [announcements.length]);

  useEffect(() => {
    if (isPaused || announcements.length <= 1) return;
    intervalRef.current = setInterval(goNext, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused, announcements.length, goNext]);

  // ─── Largeur du texte pour la vitesse du marquee ──────────────────────────
  useEffect(() => {
    if (textRef.current) {
      setTextWidth(textRef.current.scrollWidth);
    }
  }, [current?.message, isVisible]);

  const duration = useMemo(() => {
    if (textWidth === 0) return 25;
    return Math.max(18, textWidth / 65);
  }, [textWidth]);

  // ─── Dismiss persistant (sessionStorage) ─────────────────────────────────
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("announcement_dismissed");
    if (wasDismissed === "true") setDismissed(true);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    sessionStorage.setItem("announcement_dismissed", "true");
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!current?.link) return;
    const link = current.link;
    // Lien externe -> nouvel onglet, lien interne -> navigation app
    if (/^https?:\/\//i.test(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      router.push(link);
    }
  };

  if (!mounted || dismissed || !hasAnnouncement || !current) {
    return null; // Ne rien afficher si pas d'annonce publiee
  }

  const hasLink = !!current.link;
  const hasImage = !!current.image;

  return (
    <div
      className={`
        relative h-10 flex items-center overflow-hidden z-[9999]
        bg-gradient-to-r ${style.bg}
        border-b ${style.border}
        transition-all duration-300 cursor-default
      `}
      style={{ boxShadow: `0 2px 20px ${style.glow}` }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Badge type à gauche ────────────────────────────────────────────── */}
      <div className={`
        absolute left-0 z-10 px-2 sm:px-3 h-full flex items-center gap-2
        border-r ${style.border}
        bg-black/20 backdrop-blur-sm flex-shrink-0
      `}>
        {/* Image d'annonce (PNG) si fournie, sinon dot animé */}
        {hasImage ? (
          <img
            src={current.image! || "/placeholder.svg"}
            alt="Illustration de l'annonce"
            className="h-7 w-7 rounded-md object-cover border border-white/10 flex-shrink-0"
          />
        ) : (
          <span className="relative flex h-2 w-2">
            <span className={`
              animate-ping absolute inline-flex h-full w-full rounded-full opacity-60
              ${style.dot}
            `} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`} />
          </span>
        )}
        {/* Label type */}
        <span className={`
          text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5
          rounded border ${style.badge} hidden sm:block
        `}>
          {style.label}
        </span>
      </div>

      {/* ── Indicateur réseau (offline) ───────────────────────────────────── */}
      {!isOnline && (
        <div className="absolute right-16 z-10 flex items-center gap-1 text-red-400 text-[10px] font-semibold">
          <WifiOff className="h-3 w-3" />
          <span className="hidden sm:block">Hors ligne</span>
        </div>
      )}

      {/* ── Marquee ───────────────────────────────────────────────────────── */}
      <div
        className="overflow-hidden flex-1"
        style={{
          paddingLeft: hasImage ? "112px" : "90px",
          paddingRight: announcements.length > 1 ? "80px" : hasLink ? "130px" : "36px",
        }}
      >
        <div
          className="relative h-10 flex items-center"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          <span
            ref={textRef}
            className="whitespace-nowrap inline-block font-semibold text-[11px] uppercase tracking-wider text-white/90 notranslate"
            style={{
              paddingLeft: "100%",
              animation: isPaused
                ? "none"
                : `pimpay-marquee ${duration}s linear infinite`,
            }}
            translate="no"
          >
            {current.message}
            &nbsp;&nbsp;&nbsp;
            <span className="text-white/40">◆</span>
            &nbsp;&nbsp;&nbsp;
            {current.message}
            &nbsp;&nbsp;&nbsp;
            <span className="text-white/40">◆</span>
            &nbsp;&nbsp;&nbsp;
          </span>
        </div>
      </div>

      {/* ── Bouton "Cliquez ici" pour le lien (le lien complet reste cache) ── */}
      {hasLink && announcements.length <= 1 && (
        <button
          onClick={handleLinkClick}
          className={`
            absolute right-9 z-20 flex items-center gap-1.5 h-6 px-2.5
            rounded-full border ${style.badge}
            text-[9px] font-black uppercase tracking-wider
            hover:brightness-125 active:scale-95 transition-all flex-shrink-0
          `}
          title="Accéder au lien de l'annonce"
        >
          <ExternalLink className="h-3 w-3" />
          <span className="hidden sm:inline">Cliquez ici</span>
        </button>
      )}

      {/* ── Navigation multi-annonces ─────────────────────────────────────── */}
      {announcements.length > 1 && (
        <div className="absolute right-8 z-10 flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="h-5 w-5 flex items-center justify-center rounded text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          {/* Dots de pagination */}
          <div className="flex items-center gap-1">
            {announcements.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                  setTimeout(() => { setCurrentIndex(i); setIsVisible(true); }, 300);
                }}
                className={`rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? `h-1.5 w-4 ${style.dot} opacity-100`
                    : "h-1.5 w-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="h-5 w-5 flex items-center justify-center rounded text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Bouton dismiss ────────────────────────────────────────────────── */}
      <button
        onClick={handleDismiss}
        className="absolute right-1.5 z-10 h-6 w-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/80 hover:bg-white/10 transition-colors flex-shrink-0"
        title="Fermer"
      >
        <X className="h-3 w-3" />
      </button>

      {/* ── Keyframes ────────────────────────────────────────────────────── */}
      <style jsx>{`
        @keyframes pimpay-marquee {
          0%   { transform: translate(0, 0); }
          100% { transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
