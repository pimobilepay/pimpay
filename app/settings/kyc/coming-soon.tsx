"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, Clock, ArrowLeft, Lock, Info, Sparkles, FileCheck, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function KYCComingSoon() {
  const router = useRouter();
  
  // Target date: March 12, 2026 at 10:00 AM
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
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col items-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3Cpattern%20id%3D%22grid%22%20width%3D%2240%22%20height%3D%2240%22%20patternUnits%3D%22userSpaceOnUse%22%3E%3Cpath%20d%3D%22M%200%2010%20L%2040%2010%20M%2010%200%20L%2010%2040%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.02)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fpattern%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23grid)%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />
      </div>
      
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-10 relative z-10">
        <button 
          onClick={() => router.push("/")}
          className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all hover:bg-white/10"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-right">
          <p className="text-[8px] font-black text-blue-500 uppercase tracking-[4px]">PIMPAY</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase">KYC Gateway</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center text-center relative z-10">
        
        {/* Icon with Glow Effect */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full animate-pulse" />
          <div className="relative w-28 h-28 bg-gradient-to-br from-blue-600 to-blue-400 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 border border-blue-400/30">
            <ShieldCheck size={52} className="text-white" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-amber-500 to-amber-600 p-2.5 rounded-xl border-4 border-[#020617] shadow-lg">
            <Lock size={16} className="text-black" />
          </div>
          <div className="absolute -top-2 -left-2 bg-blue-500/20 p-2 rounded-lg border border-blue-500/30">
            <Sparkles size={14} className="text-blue-400" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20 mb-6">
          <Clock size={12} className="text-blue-400" />
          <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider">Lancement Imminent</span>
        </div>

        <h1 className="text-2xl font-black uppercase tracking-tight mb-4">
          Ouverture du <span className="text-blue-500">KYC</span>
        </h1>
        
        <p className="text-sm text-slate-400 font-medium leading-relaxed mb-10 px-4 max-w-sm">
          Le protocole de verification d&apos;identite arrive. Preparez vos documents pour debloquer toutes les fonctionnalites de <span className="text-white font-bold">PimPay</span>.
        </p>

        {/* Countdown */}
        <div className="grid grid-cols-4 gap-3 w-full mb-10">
          {[
            { label: "Jours", value: timeLeft.days },
            { label: "Heures", value: timeLeft.hours },
            { label: "Min", value: timeLeft.minutes },
            { label: "Sec", value: timeLeft.seconds },
          ].map((item, index) => (
            <div key={index} className="bg-slate-900/60 border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-2xl font-black text-white">{item.value.toString().padStart(2, '0')}</span>
              <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest mt-1">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Features List */}
        <div className="w-full space-y-3 mb-8">
          {[
            { icon: FileCheck, text: "Verification rapide en 24h" },
            { icon: ShieldCheck, text: "Securite niveau bancaire" },
            { icon: CheckCircle2, text: "Deblocage limites transactions" },
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <feature.icon size={14} className="text-blue-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-300">{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Documents Info */}
        <div className="w-full bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20 rounded-[2rem] p-6 flex items-start gap-4 text-left">
          <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400 shrink-0">
            <Info size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-2">Documents Acceptes</p>
            <div className="space-y-1.5">
              {[
                "Passeport International",
                "Carte d'identite Nationale",
                "Permis de conduire (Congo/Nigeria)"
              ].map((doc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-400" />
                  <p className="text-[11px] text-slate-300 font-medium">{doc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="w-full max-w-md mt-8 relative z-10">
        <button 
          onClick={() => router.push("/")}
          className="w-full py-5 bg-slate-900/60 border border-white/10 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white hover:bg-white/5 transition-all active:scale-95"
        >
          Retour au Dashboard
        </button>
      </div>

      {/* Bottom Gradient */}
      <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-blue-600/5 to-transparent pointer-events-none -z-10" />
    </div>
  );
}
