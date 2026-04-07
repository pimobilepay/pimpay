"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  AlertOctagon,
  Snowflake,
  Shield,
  Cpu,
  Activity,
  Lock,
  Zap,
  Radio,
  CircleDot,
} from "lucide-react";

/* ──────────────────────────────────────────────
   CSS keyframes & animations (pure CSS, no libs)
   ────────────────────────────────────────────── */
const spaceStyles = `
  /* ── BASE RESET ── */
  .space-bg {
    position: fixed; inset: 0; overflow: hidden;
    background: radial-gradient(ellipse at 50% 50%, #0f172a 0%, #020617 70%, #000 100%);
    z-index: 99999; font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  /* ── NEBULA LAYERS ── */
  .nebula-1, .nebula-2, .nebula-3 {
    position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none;
  }
  .nebula-1 {
    width: 600px; height: 600px; top: -10%; left: -10%;
    background: radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%);
    animation: nebulaPulse1 8s ease-in-out infinite;
  }
  .nebula-2 {
    width: 500px; height: 500px; bottom: -5%; right: -5%;
    background: radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%);
    animation: nebulaPulse2 10s ease-in-out infinite;
  }
  .nebula-3 {
    width: 400px; height: 400px; top: 30%; right: 20%;
    background: radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%);
    animation: nebulaPulse3 12s ease-in-out infinite;
  }
  @keyframes nebulaPulse1 {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.15); }
  }
  @keyframes nebulaPulse2 {
    0%, 100% { opacity: 0.5; transform: scale(1.1); }
    50% { opacity: 0.9; transform: scale(1); }
  }
  @keyframes nebulaPulse3 {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.2); }
  }

  /* ── STAR TWINKLE ── */
  .star {
    position: absolute; border-radius: 50%; background: #fff; pointer-events: none;
  }
  @keyframes twinkle1 { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
  @keyframes twinkle2 { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
  @keyframes twinkle3 { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.9; } }

  /* ── ORBIT RINGS ── */
  .orbit-container {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%); pointer-events: none;
  }
  .orbit-ring {
    position: absolute; border-radius: 50%;
    border: 1px solid rgba(6,182,212,0.08);
    top: 50%; left: 50%; transform: translate(-50%, -50%);
  }
  .orbit-ring-1 {
    width: 400px; height: 400px;
    animation: orbitSpin 40s linear infinite;
    border-color: rgba(6,182,212,0.10);
  }
  .orbit-ring-2 {
    width: 600px; height: 550px;
    animation: orbitSpin 60s linear infinite reverse;
    border-color: rgba(59,130,246,0.07);
  }
  .orbit-ring-3 {
    width: 800px; height: 750px;
    animation: orbitSpin 80s linear infinite;
    border-color: rgba(6,182,212,0.05);
  }
  .orbit-dot {
    position: absolute; width: 4px; height: 4px; border-radius: 50%;
    background: #06b6d4; box-shadow: 0 0 6px #06b6d4;
  }
  .orbit-ring-1 .orbit-dot { top: 0; left: 50%; transform: translate(-50%, -50%); }
  .orbit-ring-2 .orbit-dot { top: 50%; right: 0; transform: translate(50%, -50%); }
  .orbit-ring-3 .orbit-dot { bottom: 0; left: 50%; transform: translate(-50%, 50%); }
  @keyframes orbitSpin {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }

  /* ── FLOATING PARTICLES ── */
  .particle {
    position: absolute; border-radius: 50%; pointer-events: none;
  }
  @keyframes floatA {
    0%   { transform: translate(0, 0); }
    25%  { transform: translate(30px, -40px); }
    50%  { transform: translate(-20px, -70px); }
    75%  { transform: translate(40px, -30px); }
    100% { transform: translate(0, 0); }
  }
  @keyframes floatB {
    0%   { transform: translate(0, 0); }
    25%  { transform: translate(-40px, 20px); }
    50%  { transform: translate(30px, 50px); }
    75%  { transform: translate(-20px, -20px); }
    100% { transform: translate(0, 0); }
  }
  @keyframes floatC {
    0%   { transform: translate(0, 0); }
    33%  { transform: translate(50px, -30px); }
    66%  { transform: translate(-30px, 40px); }
    100% { transform: translate(0, 0); }
  }

  /* ── PIMPAY LOGO ── */
  .pimpay-logo {
    font-size: 3.5rem; font-weight: 900; letter-spacing: 0.3em;
    color: #fff; position: relative; display: inline-block;
    text-shadow: 0 0 20px rgba(6,182,212,0.5), 0 0 40px rgba(6,182,212,0.2);
    animation: logoGlow 4s ease-in-out infinite;
  }
  @keyframes logoGlow {
    0%, 100% { text-shadow: 0 0 20px rgba(6,182,212,0.5), 0 0 40px rgba(6,182,212,0.2); filter: brightness(1); }
    50% { text-shadow: 0 0 30px rgba(34,211,238,0.7), 0 0 60px rgba(6,182,212,0.4); filter: brightness(1.1); }
  }
  .pimpay-logo::after {
    content: ''; position: absolute; top: 0; left: -100%;
    width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent);
    animation: holoSweep 3s ease-in-out infinite;
  }
  @keyframes holoSweep {
    0% { left: -60%; }
    100% { left: 160%; }
  }
  @keyframes glitch {
    0%, 92%, 100% { transform: translate(0); opacity: 1; }
    93% { transform: translate(-2px, 1px); opacity: 0.8; }
    94% { transform: translate(2px, -1px); opacity: 0.9; }
    95% { transform: translate(-1px, 2px); opacity: 0.7; }
    96% { transform: translate(0); opacity: 1; }
  }
  .logo-glitch {
    animation: glitch 6s ease-in-out infinite;
  }

  /* ── CORE SYSTEM typing ── */
  .core-system {
    font-size: 0.75rem; letter-spacing: 0.5em; color: rgba(6,182,212,0.7);
    text-transform: uppercase; margin-top: 8px;
    overflow: hidden; white-space: nowrap;
    border-right: 2px solid rgba(6,182,212,0.5);
    width: 0; animation: typeIn 2s steps(12) 1s forwards, blink 0.8s step-end infinite 3s;
  }
  @keyframes typeIn {
    to { width: 12ch; }
  }
  @keyframes blink {
    50% { border-color: transparent; }
  }

  /* ── GLASSMORPHISM CARD ── */
  .glass-card {
    position: relative; z-index: 10;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-radius: 16px; padding: 32px;
    max-width: 520px; width: 90%; margin: 0 auto;
    box-shadow: 0 0 30px rgba(6,182,212,0.08), 0 8px 32px rgba(0,0,0,0.4);
  }
  .glass-card::before {
    content: ''; position: absolute; inset: -1px; border-radius: 17px; z-index: -1;
    background: conic-gradient(from 0deg, rgba(6,182,212,0.3), rgba(59,130,246,0.1), transparent, rgba(6,182,212,0.2), rgba(59,130,246,0.3), transparent, rgba(6,182,212,0.3));
    animation: borderSpin 6s linear infinite;
  }
  @keyframes borderSpin {
    to { background: conic-gradient(from 360deg, rgba(6,182,212,0.3), rgba(59,130,246,0.1), transparent, rgba(6,182,212,0.2), rgba(59,130,246,0.3), transparent, rgba(6,182,212,0.3)); }
  }

  /* ── STATUS BADGE ── */
  .status-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 16px; border-radius: 999px; font-size: 0.75rem;
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;
    background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.25);
    color: #22d3ee;
  }
  .status-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #22d3ee;
    animation: dotPulse 2s ease-in-out infinite;
  }
  @keyframes dotPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0.4); }
    50% { box-shadow: 0 0 0 6px rgba(34,211,238,0); }
  }

  /* ── COUNTDOWN BLOCKS ── */
  .countdown-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
    margin: 20px 0;
  }
  .countdown-block {
    text-align: center; padding: 14px 8px;
    background: rgba(6,182,212,0.05); border: 1px solid rgba(6,182,212,0.15);
    border-radius: 10px; position: relative; overflow: hidden;
  }
  .countdown-block::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(6,182,212,0.05) 0%, transparent 100%);
    pointer-events: none;
  }
  .countdown-value {
    font-size: 1.75rem; font-weight: 800; color: #fff;
    text-shadow: 0 0 12px rgba(6,182,212,0.4);
    font-variant-numeric: tabular-nums;
  }
  .countdown-label {
    font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.15em;
    color: rgba(6,182,212,0.6); margin-top: 4px;
  }
  .countdown-block.seconds .countdown-value {
    animation: secondPulse 1s ease-in-out infinite;
  }
  @keyframes secondPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; text-shadow: 0 0 20px rgba(34,211,238,0.6); }
  }

  /* ── FUTURISTIC PROGRESS BAR ── */
  .progress-container {
    position: relative; height: 6px; border-radius: 3px;
    background: rgba(6,182,212,0.08); margin: 20px 0; overflow: hidden;
  }
  .progress-fill {
    height: 100%; border-radius: 3px; position: relative;
    background: linear-gradient(90deg, #06b6d4, #3b82f6, #06b6d4);
    background-size: 200% 100%;
    animation: progressShimmer 2s linear infinite;
    transition: width 1s linear;
  }
  @keyframes progressShimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .progress-fill::after {
    content: ''; position: absolute; right: -2px; top: -4px;
    width: 14px; height: 14px; border-radius: 50%;
    background: #22d3ee; filter: blur(4px);
    animation: progressGlow 1.5s ease-in-out infinite;
  }
  @keyframes progressGlow {
    0%, 100% { opacity: 0.6; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
  }
  .progress-scan {
    position: absolute; top: 0; left: 0; width: 40px; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent);
    animation: scanMove 2.5s ease-in-out infinite;
  }
  @keyframes scanMove {
    0% { left: -40px; }
    100% { left: 100%; }
  }
  .progress-segments {
    position: absolute; inset: 0; display: flex; gap: 2px; pointer-events: none;
  }
  .progress-segment {
    flex: 1; border-right: 1px solid rgba(2,6,23,0.4);
  }

  /* ── HUD INDICATORS ── */
  .hud-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 24px;
  }
  .hud-item {
    text-align: center; font-size: 0.65rem; letter-spacing: 0.08em;
    color: rgba(6,182,212,0.6); text-transform: uppercase;
    padding: 8px 4px;
    border: 1px solid rgba(6,182,212,0.08); border-radius: 6px;
    background: rgba(6,182,212,0.02);
  }
  .hud-item .hud-label { color: rgba(255,255,255,0.4); margin-bottom: 4px; font-size: 0.55rem; }
  .hud-item .hud-value { color: #22d3ee; font-weight: 600; font-size: 0.7rem; }
  .hud-bracket { color: rgba(6,182,212,0.3); }

  /* ── SCAN LINE ── */
  .scan-line {
    position: fixed; top: 0; left: 0; right: 0; height: 1px; z-index: 100000;
    background: linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent);
    animation: scanLineMove 4s linear infinite;
    pointer-events: none;
  }
  @keyframes scanLineMove {
    0% { top: -1px; }
    100% { top: 100vh; }
  }

  /* ── LOCK ICON GLOW ── */
  .lock-glow {
    display: flex; align-items: center; justify-content: center;
    width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 16px;
    background: rgba(6,182,212,0.08);
    border: 1px solid rgba(6,182,212,0.2);
    animation: lockPulse 3s ease-in-out infinite;
  }
  @keyframes lockPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(6,182,212,0.2); }
    50% { box-shadow: 0 0 20px 5px rgba(6,182,212,0.15); }
  }

  /* ── TEXT STYLES ── */
  .maintenance-title {
    font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 6px;
  }
  .maintenance-desc {
    font-size: 0.8rem; color: rgba(255,255,255,0.5); line-height: 1.5;
  }
  .maintenance-reason {
    font-size: 0.75rem; color: rgba(6,182,212,0.5); margin-top: 4px;
    font-style: italic;
  }
  .end-date {
    font-size: 0.7rem; color: rgba(6,182,212,0.5); margin-top: 16px;
    text-align: center;
  }

  /* ── RESUMING OVERLAY ── */
  .resuming-overlay {
    position: absolute; inset: 0; z-index: 20;
    background: rgba(2,6,23,0.85); backdrop-filter: blur(6px);
    border-radius: 16px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
  }
  .resuming-spinner {
    width: 32px; height: 32px; border: 2px solid rgba(6,182,212,0.2);
    border-top-color: #22d3ee; border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── BANNED / FROZEN (futuristic polish) ── */
  .alert-fullscreen {
    position: fixed; inset: 0; z-index: 99999; display: flex;
    align-items: center; justify-content: center; flex-direction: column;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
  .alert-banned {
    background: radial-gradient(ellipse at 50% 50%, #1a0a0a 0%, #0a0000 70%, #000 100%);
  }
  .alert-frozen {
    background: radial-gradient(ellipse at 50% 50%, #0a0a1a 0%, #000010 70%, #000 100%);
  }
  .alert-card {
    background: rgba(15, 15, 25, 0.7); backdrop-filter: blur(20px);
    border-radius: 16px; padding: 40px; max-width: 440px; width: 90%;
    text-align: center;
  }
  .alert-banned .alert-card {
    border: 1px solid rgba(239,68,68,0.2);
    box-shadow: 0 0 30px rgba(239,68,68,0.08);
  }
  .alert-frozen .alert-card {
    border: 1px solid rgba(56,189,248,0.2);
    box-shadow: 0 0 30px rgba(56,189,248,0.08);
  }
  .alert-icon-wrap {
    width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 20px;
    display: flex; align-items: center; justify-content: center;
  }
  .alert-banned .alert-icon-wrap {
    background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
    animation: lockPulse 3s ease-in-out infinite;
  }
  .alert-frozen .alert-icon-wrap {
    background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.25);
    animation: lockPulse 3s ease-in-out infinite;
  }
  .alert-title {
    font-size: 1.3rem; font-weight: 800; margin-bottom: 12px;
  }
  .alert-banned .alert-title { color: #fca5a5; }
  .alert-frozen .alert-title { color: #7dd3fc; }
  .alert-body { font-size: 0.85rem; color: rgba(255,255,255,0.5); line-height: 1.6; }
  .alert-code {
    display: inline-block; margin-top: 16px; padding: 6px 16px;
    border-radius: 6px; font-size: 0.7rem; font-family: monospace;
    letter-spacing: 0.1em;
  }
  .alert-banned .alert-code {
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15);
    color: rgba(239,68,68,0.6);
  }
  .alert-frozen .alert-code {
    background: rgba(56,189,248,0.08); border: 1px solid rgba(56,189,248,0.15);
    color: rgba(56,189,248,0.6);
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 480px) {
    .pimpay-logo { font-size: 2.2rem; }
    .glass-card { padding: 24px 18px; }
    .countdown-value { font-size: 1.3rem; }
    .hud-grid { grid-template-columns: 1fr; }
  }
`;

/* ──────────────────────────────────────────────
   Star & Particle generation helpers
   ────────────────────────────────────────────── */
function generateStars(count: number) {
  const stars: { top: string; left: string; size: number; delay: string; dur: string; anim: string }[] = [];
  const anims = ["twinkle1", "twinkle2", "twinkle3"];
  for (let i = 0; i < count; i++) {
    stars.push({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      delay: `${(Math.random() * 5).toFixed(1)}s`,
      dur: `${(Math.random() * 3 + 2).toFixed(1)}s`,
      anim: anims[Math.floor(Math.random() * anims.length)],
    });
  }
  return stars;
}

function generateParticles(count: number) {
  const colors = ["#ffffff", "#06b6d4", "#3b82f6", "#22d3ee", "#06b6d4"];
  const anims = ["floatA", "floatB", "floatC"];
  const particles: {
    top: string; left: string; size: number; color: string;
    opacity: number; dur: string; delay: string; anim: string; glow: boolean;
  }[] = [];
  for (let i = 0; i < count; i++) {
    const size = Math.random() * 4 + 2;
    particles.push({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.5 + 0.2,
      dur: `${(Math.random() * 15 + 10).toFixed(1)}s`,
      delay: `${(Math.random() * 8).toFixed(1)}s`,
      anim: anims[Math.floor(Math.random() * anims.length)],
      glow: size > 4.5,
    });
  }
  return particles;
}

const STARS = generateStars(40);
const PARTICLES = generateParticles(35);

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
export default function GlobalAlert() {
  /* ── State ── */
  const [config, setConfig] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<{
    d: string;
    h: string;
    m: string;
    s: string;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [maintenanceExpired, setMaintenanceExpired] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number | null>(null);

  /* ── Force logout ── */
  const forceLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  };

  /* ── Auto-resume ── */
  const autoResumeMaintenance = useCallback(async () => {
    if (isResuming) return;
    setIsResuming(true);
    try {
      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "AUTO_RESUME" }),
      });
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch {
      setTimeout(() => {
        setIsResuming(false);
        window.location.reload();
      }, 5000);
    }
  }, [isResuming]);

  /* ── Countdown & progress ── */
  useEffect(() => {
    if (!config?.maintenanceMode) return;
    const hasEndTime = !!config?.maintenanceUntil;
    if (!hasEndTime) {
      setTimeLeft(null);
      setProgress(0);
      return;
    }
    const targetDate = new Date(config.maintenanceUntil).getTime();
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
    const timer = setInterval(() => {
      const now = Date.now();
      const distance = targetDate - now;
      if (distance <= 0) {
        setTimeLeft({ d: "00", h: "00", m: "00", s: "00" });
        setProgress(100);
        setMaintenanceExpired(true);
        clearInterval(timer);
        autoResumeMaintenance();
        return;
      }
      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft({
        d: d.toString().padStart(2, "0"),
        h: h.toString().padStart(2, "0"),
        m: m.toString().padStart(2, "0"),
        s: s.toString().padStart(2, "0"),
      });
      const totalDuration = targetDate - (startTimeRef.current || now);
      const elapsed = now - (startTimeRef.current || now);
      const currentProgress = Math.min(
        99,
        Math.max(1, (elapsed / totalDuration) * 100)
      );
      setProgress(currentProgress);
    }, 1000);
    return () => clearInterval(timer);
  }, [config, autoResumeMaintenance]);

  /* ── Config polling ── */
  useEffect(() => {
    setIsMounted(true);
    const checkConfig = async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      try {
        const res = await fetch("/api/admin/config", {
          signal: abortControllerRef.current.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data) {
          setConfig(data);
          if (data.userStatus?.isBanned) forceLogout();
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          /* silent */
        }
      }
    };
    checkConfig();
    const interval = setInterval(checkConfig, 15000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  /* ── Formatted end date ── */
  const formattedEndDate = useMemo(() => {
    if (!config?.maintenanceUntil) return null;
    const d = new Date(config.maintenanceUntil);
    return d.toLocaleString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [config?.maintenanceUntil]);

  /* ── Guard: not mounted / no config ── */
  if (!isMounted || !config) return <div className="hidden" aria-hidden="true" />;

  /* ═══════════════════════════════════════════
     SECTION 1 — BANNED SCREEN
     ═══════════════════════════════════════════ */
  if (config.userStatus?.isBanned) {
    return (
      <>
        <style>{spaceStyles}</style>
        <div className="alert-fullscreen alert-banned">
          <div className="alert-card">
            <div className="alert-icon-wrap">
              <AlertOctagon size={28} color="#ef4444" />
            </div>
            <div className="alert-title">Compte Suspendu</div>
            <p className="alert-body">
              Votre compte a été suspendu pour violation des conditions
              d&apos;utilisation de PIMPAY. Toutes les sessions actives ont
              été déconnectées.
            </p>
            {config.userStatus?.banReason && (
              <p className="alert-body" style={{ marginTop: 8 }}>
                Motif : {config.userStatus.banReason}
              </p>
            )}
            <div className="alert-code">CODE : BAN-PERMANENT</div>
          </div>
        </div>
      </>
    );
  }

  /* ═══════════════════════════════════════════
     SECTION 2 — FROZEN SCREEN
     ═══════════════════════════════════════════ */
  if (config.userStatus?.isFrozen) {
    return (
      <>
        <style>{spaceStyles}</style>
        <div className="alert-fullscreen alert-frozen">
          <div className="alert-card">
            <div className="alert-icon-wrap">
              <Snowflake size={28} color="#38bdf8" />
            </div>
            <div className="alert-title">Compte Gelé</div>
            <p className="alert-body">
              Votre compte est temporairement gelé pour vérification
              de sécurité. Veuillez contacter le support PIMPAY.
            </p>
            {config.userStatus?.freezeReason && (
              <p className="alert-body" style={{ marginTop: 8 }}>
                Motif : {config.userStatus.freezeReason}
              </p>
            )}
            <div className="alert-code">CODE : FREEZE-SECURITY</div>
          </div>
        </div>
      </>
    );
  }

  /* ═══════════════════════════════════════════
     SECTION 3 — MAINTENANCE (Futuristic/Space)
     ═══════════════════════════════════════════ */
  const canBypassMaintenance =
    config.isAdmin ||
    config.isBankAdmin ||
    config.isBusinessAdmin ||
    config.isAgent;

  if (config.maintenanceMode && !canBypassMaintenance) {
    return (
      <>
        <style>{spaceStyles}</style>
        <div className="space-bg">
          {/* ── Scan line ── */}
          <div className="scan-line" />

          {/* ── Nebulae ── */}
          <div className="nebula-1" />
          <div className="nebula-2" />
          <div className="nebula-3" />

          {/* ── Stars ── */}
          {STARS.map((s, i) => (
            <div
              key={`star-${i}`}
              className="star"
              style={{
                top: s.top,
                left: s.left,
                width: s.size,
                height: s.size,
                animation: `${s.anim} ${s.dur} ease-in-out ${s.delay} infinite`,
              }}
            />
          ))}

          {/* ── Orbit rings ── */}
          <div className="orbit-container">
            <div className="orbit-ring orbit-ring-1">
              <div className="orbit-dot" />
            </div>
            <div className="orbit-ring orbit-ring-2">
              <div className="orbit-dot" />
            </div>
            <div className="orbit-ring orbit-ring-3">
              <div className="orbit-dot" />
            </div>
          </div>

          {/* ── Floating particles ── */}
          {PARTICLES.map((p, i) => (
            <div
              key={`p-${i}`}
              className="particle"
              style={{
                top: p.top,
                left: p.left,
                width: p.size,
                height: p.size,
                background: p.color,
                opacity: p.opacity,
                boxShadow: p.glow
                  ? `0 0 ${p.size * 3}px ${p.color}`
                  : "none",
                animation: `${p.anim} ${p.dur} ease-in-out ${p.delay} infinite`,
              }}
            />
          ))}

          {/* ── Centered content ── */}
          <div
            style={{
              position: "relative",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100vh",
              padding: "24px",
              gap: "32px",
            }}
          >
            {/* ── PIMPAY Logo ── */}
            <div style={{ textAlign: "center" }}>
              <div className="pimpay-logo logo-glitch">PIMPAY</div>
              <div className="core-system">CORE SYSTEM</div>
            </div>

            {/* ── Glass Card ── */}
            <div className="glass-card" style={{ position: "relative" }}>
              {/* Resuming overlay */}
              {isResuming && (
                <div className="resuming-overlay">
                  <div className="resuming-spinner" />
                  <span
                    style={{
                      color: "#22d3ee",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                    }}
                  >
                    Reprise en cours…
                  </span>
                </div>
              )}

              {/* Status badge */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div className="status-badge">
                  <span className="status-dot" />
                  {maintenanceExpired
                    ? "Reprise imminente"
                    : "Maintenance active"}
                </div>
              </div>

              {/* Lock icon */}
              <div className="lock-glow">
                <Lock size={24} color="#22d3ee" />
              </div>

              {/* Title & description */}
              <div style={{ textAlign: "center" }}>
                <div className="maintenance-title">
                  Système en maintenance
                </div>
                <div className="maintenance-desc">
                  {config.maintenanceMessage ||
                    "Notre équipe technique effectue des opérations de maintenance. Le service sera rétabli automatiquement."}
                </div>
                {config.maintenanceReason && (
                  <div className="maintenance-reason">
                    {config.maintenanceReason}
                  </div>
                )}
              </div>

              {/* Countdown */}
              {timeLeft && (
                <div className="countdown-grid">
                  {(
                    [
                      ["d", "Jours"],
                      ["h", "Heures"],
                      ["m", "Minutes"],
                      ["s", "Secondes"],
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className={`countdown-block${
                        key === "s" ? " seconds" : ""
                      }`}
                    >
                      <div className="countdown-value">
                        {timeLeft[key as keyof typeof timeLeft]}
                      </div>
                      <div className="countdown-label">{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress bar */}
              <div className="progress-container">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
                <div className="progress-scan" />
                <div className="progress-segments">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="progress-segment" />
                  ))}
                </div>
              </div>

              {/* Progress label */}
              <div
                style={{
                  textAlign: "center",
                  fontSize: "0.7rem",
                  color: "rgba(6,182,212,0.5)",
                  letterSpacing: "0.05em",
                }}
              >
                Progression : {Math.round(progress)}%
              </div>

              {/* HUD indicators */}
              <div className="hud-grid">
                <div className="hud-item">
                  <div className="hud-label">
                    <Cpu size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                    Système
                  </div>
                  <div className="hud-value">
                    <span className="hud-bracket">[</span> EN COURS{" "}
                    <span className="hud-bracket">]</span>
                  </div>
                </div>
                <div className="hud-item">
                  <div className="hud-label">
                    <Shield size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                    Sécurité
                  </div>
                  <div className="hud-value">
                    <span className="hud-bracket">[</span> ACTIF{" "}
                    <span className="hud-bracket">]</span>
                  </div>
                </div>
                <div className="hud-item">
                  <div className="hud-label">
                    <Activity size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                    Réseau
                  </div>
                  <div className="hud-value">
                    <span className="hud-bracket">[</span> STABLE{" "}
                    <span className="hud-bracket">]</span>
                  </div>
                </div>
              </div>

              {/* End date */}
              {formattedEndDate && (
                <div className="end-date">
                  Fin estimée : {formattedEndDate}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── No alert ── */
  return null;
}
