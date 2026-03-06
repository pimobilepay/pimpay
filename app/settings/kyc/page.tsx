"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, Clock, ArrowLeft, Lock, Info } from "lucide-react";
import { useRouter } from "next/navigation";

export default function KYCComingSoon() {
  const router = useRouter();
  
  // ✅ DATE RÉGLÉE SUR LE 12 MARS 2026 À 10H00
  // Note : En JS, les mois commencent à 0 (0 = Janvier, 1 = Février, 2 = Mars)
  const targetDate = new Date(2026, 2, 12, 10, 0, 0).getTime(); 

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col items-center p-6">
      
      {/* Header - Identité visuelle PimPay */}
      <div className="w-full max-w-md flex items-center justify-between mb-12">
        <button 
          onClick={() => router.push("/")}
          className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-right">
          <p className="text-[8px] font-black text-blue-500 uppercase tracking-[4px]">PIMPAY</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase">KYC Gateway</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center text-center">
        
        {/* Icône de Sécurité avec effet Glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-400 rounded-[32px] flex items-center justify-center shadow-2xl shadow-blue-500/40">
            <ShieldCheck size={48} className="text-white" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-amber-500 p-2 rounded-xl border-4 border-[#020617]">
            <Lock size={16} className="text-black" />
          </div>
        </div>

        <h1 className="text-2xl font-black uppercase tracking-tight mb-4">
          Ouverture du <span className="text-blue-500">KYC</span>
        </h1>
        
        <p className="text-sm text-slate-400 font-medium leading-relaxed mb-10 px-4">
          Le protocole de vérification d'identité arrive. Préparez vos documents pour débloquer toutes les fonctionnalités de <span className="text-white font-bold">PimPay</span>.
        </p>

        {/* Compteur 6 jours */}
        <div className="grid grid-cols-4 gap-3 w-full mb-12">
          {[
            { label: "Jours", value: timeLeft.days },
            { label: "Heures", value: timeLeft.hours },
            { label: "Min", value: timeLeft.minutes },
            { label: "Sec", value: timeLeft.seconds },
          ].map((item, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-[24px] p-4 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-2xl font-black text-white">{item.value.toString().padStart(2, '0')}</span>
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Info Box - Liste des pièces */}
        <div className="w-full bg-blue-500/5 border border-blue-500/20 rounded-[32px] p-6 flex items-start gap-4 text-left">
          <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
            <Info size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Documents Acceptés</p>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              • Passeport International<br />
              • Carte d'identité Nationale<br />
              • Permis de conduire (Congo/Nigeria)
            </p>
          </div>
        </div>
      </div>

      {/* Bouton de retour */}
      <div className="w-full max-w-md mt-10">
        <button 
          onClick={() => router.push("/")}
          className="w-full py-5 bg-white/5 border border-white/10 rounded-[28px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white transition-all active:scale-95"
        >
          Retour au Dashboard
        </button>
      </div>

      <div className="fixed bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-600/5 to-transparent pointer-events-none -z-10"></div>
    </div>
  );
}
