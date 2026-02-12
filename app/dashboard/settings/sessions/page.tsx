import { prisma } from "@/lib/prisma";
import {
  ShieldCheck,
  Monitor,
  Smartphone,
  Globe,
  MapPin,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import LogoutOthersButton from "@/components/sessions/LogoutOthersButton";
import RevokeSessionButton from "@/components/sessions/RevokeSessionButton";
import { cookies } from "next/headers";
import * as jose from "jose";
import "flag-icons/css/flag-icons.min.css";

/**
 * Helper pour le drapeau - Version "Square/Rect" sans cercle
 */
const CountryFlag = ({ countryCode }: { countryCode: string | null | undefined }) => {
  const code = countryCode?.toLowerCase() || "cg";
  return (
    <span 
      className={`fi fi-${code} shadow-sm`} 
      style={{ 
        borderRadius: '1px', // Presque carré, très pro
        width: '18px', 
        height: '13px',
        display: 'inline-block' 
      }} 
    />
  );
};

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true }
    });
  } catch (error) {
    return null;
  }
}

export default async function SessionsPage() {
  const user = await getAuthenticatedUser();
  const cookieStore = await cookies(); 
  const currentToken = cookieStore.get("token")?.value;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
        <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/10 max-w-xs w-full">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-black text-white uppercase italic">Accès Refusé</h2>
          <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-tighter">Session expirée.</p>
        </div>
      </div>
    );
  }

  const sessions = await prisma.session.findMany({
    where: {
        userId: user.id,
        isActive: true
    },
    orderBy: { lastActiveAt: 'desc' },
  });

  return (
    <div className="min-h-[100dvh] bg-[#020617] text-white p-6 pb-32 font-sans overflow-y-auto">
      <div className="max-w-md mx-auto">

        {/* HEADER */}
        <div className="flex flex-col items-center text-center mb-8 pt-6">
          <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
            <ShieldCheck className="text-blue-500" size={24} />
          </div>
          <h1 className="text-xl font-black uppercase italic tracking-tighter">
            PimPay<span className="text-blue-500">Security</span>
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
              {sessions.length} APPAREIL{sessions.length > 1 ? 'S' : ''} ACTIF{sessions.length > 1 ? 'S' : ''}
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <LogoutOthersButton />
        </div>

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="p-10 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10 text-slate-500">
              Aucune session active.
            </div>
          ) : (
            sessions.map((session) => {
              const isCurrent = session.token === currentToken;
              const isMobile = session.deviceName?.toLowerCase().includes("android") ||
                               session.deviceName?.toLowerCase().includes("iphone") ||
                               session.userAgent?.toLowerCase().includes("mobile");

              return (
                <div
                  key={session.id}
                  className={`p-5 rounded-[2.5rem] border transition-all duration-300 ${
                    isCurrent
                    ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                    : 'bg-slate-900/40 border-white/5'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isCurrent ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {isMobile ? <Smartphone size={24} /> : <Monitor size={24} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-black text-[13px] truncate uppercase tracking-tight">
                          {session.deviceName || "Appareil Inconnu"}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase rounded-md border border-emerald-500/20">
                            Actuel
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          <Globe size={12} className="text-blue-500" />
                          {session.ip} <span className="text-slate-700">•</span> {session.browser || "Browser"}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          {/* Drapeau carré ajusté */}
                          <div className="flex items-center">
                            <CountryFlag countryCode={session.country} />
                          </div>
                          <span className="ml-1">{session.city || "Oyo"}, {session.countryName || "Congo"}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                          <Clock size={12} className="text-slate-600" />
                          {formatDistanceToNow(new Date(session.lastActiveAt), {
                            addSuffix: true,
                            locale: fr
                          })}
                        </div>
                      </div>
                    </div>

                    {!isCurrent && (
                      <div className="self-center">
                        <RevokeSessionButton sessionId={session.id} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* SECURITY NOTE */}
        <div className="mt-8 p-6 bg-slate-900/50 rounded-[2.5rem] border border-white/5 flex gap-4 items-start">
          <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-500">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Contrôle de sécurité</h4>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed font-bold uppercase italic">
              Si un accès ne provient pas de vous, révoquez-le et sécurisez votre compte PimPay immédiatement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
