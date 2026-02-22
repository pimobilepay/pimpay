"use client";

import { useEffect, useState, useRef, useMemo } from "react";

export default function GlobalAnnouncement() {
  const [msg, setMsg] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    setMounted(true);
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/admin/config");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.globalAnnouncement) {
          setMsg(data.globalAnnouncement);
        }
      } catch (e) {
        // Silently fail - config API may not be available
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (textRef.current) {
      setTextWidth(textRef.current.scrollWidth);
    }
  }, [msg]);

  // Calcule la durée en fonction de la largeur du texte
  // ~60px/s = vitesse de lecture confortable
  const duration = useMemo(() => {
    if (textWidth === 0) return 25;
    const pixelsPerSecond = 60;
    const calculatedDuration = textWidth / pixelsPerSecond;
    // Minimum 15s, pas de max pour les textes très longs
    return Math.max(15, calculatedDuration);
  }, [textWidth]);

  // IMPORTANT: Si pas encore monté ou pas de message, on retourne une DIV VIDE de même hauteur
  // pour éviter que React ne doive recalculer tout le layout brusquement (layout shift)
  if (!mounted || !msg) {
    return <div className="h-9 bg-[#020617]" />; 
  }

  return (
    <div className="bg-indigo-600 text-white h-9 flex items-center overflow-hidden relative z-[9999] notranslate" translate="no">
      <div className="marquee-container">
        <span ref={textRef} className="marquee-text font-bold text-sm uppercase" style={{ animationDuration: `${duration}s` }}>
          {"📢 " + msg + " \u00A0\u00A0\u00A0 📢 " + msg + " \u00A0\u00A0\u00A0 📢 " + msg + " \u00A0\u00A0\u00A0 📢 " + msg}
        </span>
      </div>

      <style jsx>{`
        .marquee-container {
          display: flex;
          width: 100%;
          overflow: hidden;
        }
        .marquee-text {
          white-space: nowrap;
          display: inline-block;
          padding-left: 100%;
          animation: marquee-animation linear infinite;
        }
        @keyframes marquee-animation {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-100%, 0); }
        }
      `}</style>
    </div>
  );
}
