"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Fingerprint, 
  ShieldCheck, 
  ArrowLeft, 
  Loader2, 
  Zap,
  Lock,
  Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";

export default function BiometricPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Vérifier si le navigateur supporte la biométrie
    if (!window.PublicKeyCredential) {
      setIsSupported(false);
    }
  }, []);

  const handleBiometricAuth = async () => {
    setIsAuthenticating(true);
    
    try {
      // Simulation d'une authentification biométrique (WebAuthn)
      // Dans une version réelle, tu ferais appel à navigator.credentials.get()
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      toast.success("Authentification réussie !");
      router.push("/wallet"); // Redirection vers le wallet après succès
    } catch (error) {
      toast.error("Échec de la lecture biométrique");
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="w-full min-h-screen bg-[#020617] text-white font-sans selection:bg-blue-500/30 flex flex-col">
      
      {/* HEADER AJUSTÉ */}
      <div className="max-w-md mx-auto w-full px-6 pt-12">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-3 bg-slate-900 border border-white/5 rounded-full active:scale-90 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Sécurité</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Protection Biométrique</p>
          </div>
        </div>

        {/* CONTENU CENTRAL */}
        <div className="flex flex-col items-center justify-center space-y-12 py-10">
          
          {/* CERCLE D'EMPREINTE ANIMÉ */}
          <div className="relative">
            <div className="absolute inset-0 bg-blue-600/20 blur-[60px] rounded-full animate-pulse"></div>
            <div className={`relative p-10 rounded-full border-2 transition-all duration-500 ${isAuthenticating ? 'border-blue-500 scale-110' : 'border-white/10'}`}>
              <Fingerprint 
                size={80} 
                className={`${isAuthenticating ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`}
              />
              {isAuthenticating && (
                <div className="absolute inset-0 border-t-2 border-blue-400 rounded-full animate-spin"></div>
              )}
            </div>
          </div>

          <div className="text-center space-y-4">
            <h2 className="text-2xl font-black tracking-tighter uppercase italic">Confirmez votre identité</h2>
            <p className="text-sm text-slate-400 max-w-[250px] mx-auto leading-relaxed">
              Utilisez votre empreinte digitale ou FaceID pour accéder à votre compte **pimpay**.
            </p>
          </div>

          {/* INFOS SÉCURITÉ */}
          <Card className="bg-slate-900/40 border-white/5 p-6 rounded-[2.5rem] w-full max-w-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <ShieldCheck size={24} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-black uppercase tracking-widest">Données Chiffrées</p>
                <p className="text-[10px] text-slate-500 italic">Vos données biométriques ne quittent jamais cet appareil.</p>
              </div>
            </div>
          </Card>

          <div className="w-full space-y-4">
            <Button
              onClick={handleBiometricAuth}
              disabled={isAuthenticating || !isSupported}
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95"
            >
              {isAuthenticating ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                "Scanner maintenant"
              )}
            </Button>
            
            <button 
              onClick={() => router.push("/auth/password")}
              className="w-full text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-colors"
            >
              Utiliser le mot de passe à la place
            </button>
          </div>
        </div>

        {/* PIED DE PAGE PROTOCOLE */}
        <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 opacity-30">
                <Zap size={14} fill="currentColor" className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-tighter italic">PimPay Security Node</span>
            </div>
        </div>
      </div>

      {/* Navigation mobile */}
      <div className="lg:hidden">
        <BottomNav onOpenMenu={() => {}} />
      </div>
    </div>
  );
}
