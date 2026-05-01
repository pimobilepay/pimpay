"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight, Sparkles, AlertCircle, Bell, ShieldCheck } from "lucide-react";

/* ─── helpers ────────────────────────────────────────────── */
type Tone = "info" | "warning" | "urgent" | "promo";

function detectTone(msg: string): Tone {
  const lower = msg.toLowerCase();
  if (lower.includes("urgent") || lower.includes("critique") || lower.includes("danger") || lower.includes("alerte")) return "urgent";
  if (lower.includes("maintenance") || lower.includes("attention") || lower.includes("important")) return "warning";
  if (lower.includes("nouveau") || lower.includes("offre") || lower.includes("bonus") || lower.includes("promo") || lower.includes("kyc")) return "promo";
  return "info";
}

const TONE_CONFIG: Record<Tone, {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  dot: string;
  ctaText: string;
  icon: React.ReactNode;
}> = {
  info: {
    bg: "#f5f5f0",
    border: "rgba(0,0,0,0.06)",
    text: "#1a1a1a",
    badgeBg: "rgba(0,0,0,0.04)",
    badgeText: "#525252",
    badgeLabel: "INFO",
    dot: "#525252",
    ctaText: "En savoir plus",
    icon: <Bell size={13} strokeWidth={1.5} />,
  },
  warning: {
    bg: "#fefce8",
    border: "rgba(202,138,4,0.15)",
    text: "#854d0e",
    badgeBg: "rgba(202,138,4,0.08)",
    badgeText: "#a16207",
    badgeLabel: "AVIS",
    dot: "#ca8a04",
    ctaText: "Voir les details",
    icon: <AlertCircle size={13} strokeWidth={1.5} />,
  },
  urgent: {
    bg: "#fef2f2",
    border: "rgba(220,38,38,0.15)",
    text: "#991b1b",
    badgeBg: "rgba(220,38,38,0.08)",
    badgeText: "#dc2626",
    badgeLabel: "URGENT",
    dot: "#dc2626",
    ctaText: "Action requise",
    icon: <AlertCircle size={13} strokeWidth={1.5} />,
  },
  promo: {
    bg: "#f0fdf4",
    border: "rgba(22,163,74,0.15)",
    text: "#166534",
    badgeBg: "rgba(22,163,74,0.08)",
    badgeText: "#16a34a",
    badgeLabel: "NOUVEAU",
    dot: "#16a34a",
    ctaText: "Decouvrir",
    icon: <Sparkles size={13} strokeWidth={1.5} />,
  },
};

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
export default function GlobalAnnouncement() {
  const [msg, setMsg] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const router = useRouter();

  /* fetch config */
  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem("announcement_dismissed");
    if (stored) { setDismissed(true); return; }
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/admin/config");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.globalAnnouncement) setMsg(data.globalAnnouncement);
      } catch {
        // fail silent
      }
    };
    fetchConfig();
  }, []);

  /* measure text */
  useEffect(() => {
    if (textRef.current) setTextWidth(textRef.current.scrollWidth);
  }, [msg]);

  const tone = useMemo(() => detectTone(msg), [msg]);
  const cfg = TONE_CONFIG[tone];

  const duration = useMemo(() => {
    if (textWidth === 0) return 45;
    return Math.max(35, textWidth / 25);
  }, [textWidth]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    sessionStorage.setItem("announcement_dismissed", "1");
  }, []);

  const handleClick = useCallback(() => {
    router.push("/settings/kyc");
  }, [router]);

  /* ── nothing to show ── */
  if (!mounted || !msg || dismissed) {
    return <div className="h-0" />;
  }

  return (
    <>
      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        .announcement-bar {
          animation: slide-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: ticker linear infinite;
          animation-duration: ${duration}s;
          animation-play-state: ${isHovered ? "paused" : "running"};
        }
        .pulse-dot {
          animation: pulse-dot 2s ease-in-out infinite;
        }
      `}</style>

      <div
        className="announcement-bar relative z-[9999] overflow-hidden cursor-pointer select-none notranslate"
        translate="no"
        style={{
          height: "44px",
          background: cfg.bg,
          borderBottom: `1px solid ${cfg.border}`,
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Left section with icon and badge */}
        <div 
          className="absolute left-0 top-0 h-full z-10 flex items-center gap-2.5 px-4"
          style={{ borderRight: `1px solid ${cfg.border}` }}
        >
          {/* Pulse indicator */}
          <span 
            className="pulse-dot w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: cfg.dot }} 
          />
          {/* Icon and label */}
          <span 
            className="hidden sm:flex items-center gap-2"
            style={{ color: cfg.badgeText }}
          >
            {cfg.icon}
            <span className="text-[11px] font-semibold tracking-wide">
              {cfg.badgeLabel}
            </span>
          </span>
        </div>

        {/* Ticker content */}
        <div className="absolute inset-0 flex items-center overflow-hidden pl-28 sm:pl-36 pr-32 sm:pr-44">
          <div className="ticker-track">
            {[0, 1].map(i => (
              <span
                key={i}
                ref={i === 0 ? textRef : undefined}
                className="whitespace-nowrap text-[13px] font-medium tracking-wide"
                style={{ color: cfg.text, paddingRight: "6rem" }}
              >
                {msg}
                <span className="mx-8 opacity-30" style={{ color: cfg.dot }}>|</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right section with CTA and close */}
        <div 
          className="absolute right-0 top-0 h-full z-10 flex items-center gap-1"
          style={{ 
            background: `linear-gradient(90deg, transparent, ${cfg.bg} 20%)`,
            paddingLeft: "2rem"
          }}
        >
          {/* CTA Button */}
          <button
            type="button"
            className="hidden sm:flex items-center gap-1.5 text-[12px] font-semibold px-4 py-1.5 rounded-full transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ 
              backgroundColor: cfg.badgeText, 
              color: "#ffffff",
            }}
            onClick={handleClick}
          >
            {cfg.ctaText}
            <ArrowRight size={12} strokeWidth={2} />
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            aria-label="Fermer l'annonce"
            onClick={handleDismiss}
            className="h-full px-4 flex items-center justify-center transition-opacity hover:opacity-60"
            style={{ color: cfg.text, opacity: 0.4 }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </>
  );
}
