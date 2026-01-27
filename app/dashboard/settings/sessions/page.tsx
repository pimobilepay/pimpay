import { prisma } from "@/lib/prisma";
import {
  ShieldCheck,
  Monitor,
  Smartphone,
  Globe,
  MapPin,
  Clock,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import LogoutOthersButton from "@/components/sessions/LogoutOthersButton";
import RevokeSessionButton from "@/components/sessions/RevokeSessionButton";
import { cookies } from "next/headers";
import * as jose from "jose";

/**
 * Flag Emoji Helper
 */
const getFlagEmoji = (countryCode: string | null | undefined) => {
  if (!countryCode || countryCode.length !== 2) return "🇨🇬";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

async function getAuthenticatedUser() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;
    
    // On récupère l'utilisateur en s'assurant qu'il existe
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
  const currentToken = cookies().get("token")?.value;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
        <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/10 max-w-xs w-full">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-black text-white uppercase italic">Accès Refusé</h2>
          <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-tighter">Session expirée ou invalide.</p>
        </div>
      </div>
    );
  }

  // Correction : On s'assure de ne récupérer que les sessions actives
  const sessions = await prisma.session.findMany({
    where: { 
        userId: user.id,
        isActive: true // Filtrer uniquement les sessions valides
    },
    orderBy: { lastActiveAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* HEADER STYLE PIMPAY */}
        <div className="flex justify-between items-center mb-8 pt-6">
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              PimPay<span className="text-blue-500">Security</span>
            </h1>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">
                {sessions.length} Appareil{sessions.length > 1 ? 's' : ''} connecté{sessions.length > 1 ? 's' : ''}
            </p>
          </div>
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
                  className={`p-5 rounded-[2rem] border transition-all ${
                    isCurrent 
                    ? 'bg-blue-600/10 border-blue-500/30 ring-1 ring-blue-500/20' 
                    : 'bg-white/5 border-white/5'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isCurrent ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {isMobile ? <Smartphone size={24} /> : <Monitor size={24} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-sm truncate uppercase tracking-tight">
                          {session.deviceName || "Appareil Inconnu"}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-emerald-500 text-black text-[8px] font-black uppercase rounded-md animate-pulse">
                            Actuel
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          <Globe size={12} className="text-blue-500" />
                          {session.ip} • {session.browser || "Navigateur"}
                        </div>
                        
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          <MapPin size={12} className="text-rose-500" />
                          {session.city || "Oyo"}, {session.country || "Congo"} {getFlagEmoji(session.country)}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                          <Clock size={12} />
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
        <div className="mt-8 p-5 bg-blue-600/5 rounded-[2rem] border border-blue-500/10 flex gap-4 items-start">
          <div className="p-2 bg-blue-600/20 rounded-xl text-blue-500">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Contrôle d'accès</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-bold uppercase">
              Si un appareil vous semble suspect, révoquez-le immédiatement et changez vos accès PimPay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
