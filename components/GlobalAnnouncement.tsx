"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronRight, Megaphone, Zap, AlertTriangle, Info } from "lucide-react";

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
  glow: string;
  ctaText: string;
  icon: React.ReactNode;
}> = {
  info: {
    bg: "linear-gradient(90deg, #0c1a3a 0%, #0f2050 50%, #0c1a3a 100%)",
    border: "rgba(59,130,246,0.3)",
    text: "#93c5fd",
    badgeBg: "rgba(59,130,246,0.15)",
    badgeText: "#60a5fa",
    badgeLabel: "INFO",
    dot: "#3b82f6",
    glow: "rgba(59,130,246,0.15)",
    ctaText: "En savoir plus",
    icon: <Info size={11} />,
  },
  warning: {
    bg: "linear-gradient(90deg, #1c1200 0%, #2d1e00 50%, #1c1200 100%)",
    border: "rgba(245,158,11,0.35)",
    text: "#fcd34d",
    badgeBg: "rgba(245,158,11,0.15)",
    badgeText: "#f59e0b",
    badgeLabel: "AVIS",
    dot: "#f59e0b",
    glow: "rgba(245,158,11,0.12)",
    ctaText: "Voir les détails",
    icon: <AlertTriangle size={11} />,
  },
  urgent: {
    bg: "linear-gradient(90deg, #1a0000 0%, #2d0505 50%, #1a0000 100%)",
    border: "rgba(239,68,68,0.4)",
    text: "#fca5a5",
    badgeBg: "rgba(239,68,68,0.15)",
    badgeText: "#f87171",
    badgeLabel: "URGENT",
    dot: "#ef4444",
    glow: "rgba(239,68,68,0.15)",
    ctaText: "Action requise",
    icon: <Zap size={11} />,
  },
  promo: {
    bg: "linear-gradient(90deg, #0a1a0f 0%, #0d2318 50%, #0a1a0f 100%)",
    border: "rgba(16,185,129,0.35)",
    text: "#6ee7b7",
    badgeBg: "rgba(16,185,129,0.15)",
    badgeText: "#34d399",
    badgeLabel: "NOUVEAU",
    dot: "#10b981",
    glow: "rgba(16,185,129,0.12)",
    ctaText: "Découvrir",
    icon: <Megaphone size={11} />,
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
    if (textWidth === 0) return 28;
    return Math.max(18, textWidth / 65);
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
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1;   }
        }
        @keyframes dot-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
        .announcement-bar {
          animation: slide-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: ticker linear infinite;
          animation-duration: ${duration}s;
          animation-play-state: ${isHovered ? "paused" : "running"};
        }
        .live-dot {
          animation: dot-blink 1.4s ease-in-out infinite;
        }
        .glow-line {
          animation: glow-pulse 2.5s ease-in-out infinite;
        }
      `}</style>

      <div
        className="announcement-bar relative z-[9999] overflow-hidden cursor-pointer select-none notranslate"
        translate="no"
        style={{
          height: "40px",
          background: cfg.bg,
          borderBottom: `1px solid ${cfg.border}`,
          boxShadow: `0 2px 20px ${cfg.glow}, inset 0 1px 0 ${cfg.border}`,
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
        />

        {/* Left badge */}
        <div className="absolute left-0 top-0 h-full z-10 flex items-center px-3 gap-2"
          style={{ background: cfg.badgeBg, borderRight: `1px solid ${cfg.border}` }}>
          {/* Live dot */}
          <span className="live-dot w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
          {/* Icon + label */}
          <span style={{ color: cfg.badgeText }} className="hidden sm:flex items-center gap-1">
            {cfg.icon}
            <span className="text-[8px] font-black tracking-[2.5px] uppercase">{cfg.badgeLabel}</span>
          </span>
        </div>

        {/* Ticker */}
        <div className="absolute inset-0 flex items-center overflow-hidden pl-24 sm:pl-28 pr-28 sm:pr-32">
          <div className="ticker-track">
            {/* Two copies = seamless loop */}
            {[0, 1].map(i => (
              <span
                key={i}
                ref={i === 0 ? textRef : undefined}
                className="whitespace-nowrap text-[10px] font-bold tracking-[0.08em] uppercase"
                style={{ color: cfg.text, paddingRight: "4rem" }}
              >
                {msg}
                <span className="mx-6 opacity-40" style={{ color: cfg.dot }}>◆</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right CTA + dismiss */}
        <div className="absolute right-0 top-0 h-full z-10 flex items-center"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.badgeBg} 30%)` }}>

          {/* CTA pill */}
          <button
            type="button"
            className="hidden sm:flex items-center gap-1 mr-1 text-[8px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 transition-all active:scale-95"
            style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeText, border: `1px solid ${cfg.border}` }}
            onClick={handleClick}
          >
            {cfg.ctaText}
            <ChevronRight size={9} />
          </button>

          {/* Dismiss */}
          <button
            type="button"
            aria-label="Fermer l'annonce"
            onClick={handleDismiss}
            className="h-full px-3 flex items-center justify-center transition-opacity hover:opacity-70 active:scale-95"
            style={{ color: cfg.text, opacity: 0.5, borderLeft: `1px solid ${cfg.border}` }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Bottom glow line */}
        <div className="glow-line absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.dot}, transparent)` }} />
      </div>
    </>
  );
}
