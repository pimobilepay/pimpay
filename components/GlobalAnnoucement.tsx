"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function GlobalAnnouncement() {
  const [msg, setMsg] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  const router = useRouter();

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
        // Fail silencieux
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (textRef.current) {
      setTextWidth(textRef.current.scrollWidth);
    }
  }, [msg]);

  const duration = useMemo(() => {
    if (textWidth === 0) return 25;
    const pixelsPerSecond = 60;
    const calculatedDuration = textWidth / pixelsPerSecond;
    return Math.max(15, calculatedDuration);
  }, [textWidth]);

  if (!mounted || !msg) {
    return <div className="h-9 bg-[#020617]" />;
  }

  return (
    // J'ai ajouté un curseur pointeur et un événement onClick pour rediriger vers le KYC
    <div 
      onClick={() => router.push("/settings/kyc")}
      className="bg-blue-600 text-white h-10 flex items-center overflow-hidden relative z-[9999] notranslate cursor-pointer border-y border-blue-400/30 shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
      translate="no"
    >
      {/* Petit badge "LIVE" clignotant pour l'urgence */}
      <div className="absolute left-0 z-10 bg-blue-700 px-3 h-full flex items-center border-r border-blue-400/30">
        <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]"></div>
      </div>

      <div className="marquee-container w-full">
        <span 
          ref={textRef} 
          className="marquee-text font-black text-[11px] uppercase tracking-wider" 
          style={{ animationDuration: `${duration}s` }}
        >
          {/* On répète le message de l'API avec des séparateurs stylés */}
          {" ⚠️ " + msg + " \u00A0\u00A0\u00A0 [CLIQUEZ ICI] \u00A0\u00A0\u00A0 ⚠️ " + msg + " \u00A0\u00A0\u00A0 [CLIQUEZ ICI] "}
        </span>
      </div>

      <style jsx>{`
        .marquee-container {
          display: flex;
          width: 100%;
          overflow: hidden;
          background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%);
        }
        .marquee-text {
          white-space: nowrap;
          display: inline-block;
          padding-left: 100%;
          animation: marquee-animation linear infinite;
          will-change: transform;
        }
        @keyframes marquee-animation {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-100%, 0); }
        }
      `}</style>
    </div>
  );
}

