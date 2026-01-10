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
import RevokeSessionButton from "@/components/sessions/RevokeSessionButton"; // Import du nouveau bouton
import { cookies } from "next/headers";
import * as jose from "jose";

/**
 * Fonction pour transformer un code pays (ex: "CD") en emoji drapeau
 */
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return "🇨🇬"; // Congo par défaut si vide
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
    return await prisma.user.findUnique({
      where: { id: userId, status: "ACTIVE" },
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
      <div className="p-12 text-center">
        <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-full mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Accès refusé</h2>
        <p className="text-gray-500 mt-2">Veuillez vous reconnecter à votre compte pimpay.</p>
      </div>
    );
  }

  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { lastActiveAt: 'desc' },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header avec la couleur de titre Pimpay corrigée */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#2563eb] flex items-center gap-2">
            <ShieldCheck className="text-[#2563eb]" />
            Sécurité et Sessions
          </h1>
          <p className="text-gray-500 text-sm">
            Gérer les sessions actives.
          </p>
        </div>

        <LogoutOthersButton />
      </div>

      {/* Liste des sessions - Design original conservé */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {sessions.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              Aucune session active trouvée.
            </div>
          ) : (
            sessions.map((session) => {
              const isCurrent = session.token === currentToken;

              const isMobile = session.userAgent?.toLowerCase().includes("android") ||
                               session.userAgent?.toLowerCase().includes("iphone") ||
                               session.userAgent?.toLowerCase().includes("mobile");

              return (
                <div
                  key={session.id}
                  className={`p-6 flex items-center justify-between transition-colors ${
                    isCurrent ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      isCurrent
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isMobile ? <Smartphone size={24} /> : <Monitor size={24} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          {session.os || "Appareil inconnu"}
                          <span className="text-gray-400 font-normal mx-1">•</span>
                          <span className="text-gray-600 font-medium text-sm">
                            {session.browser || "Navigateur"}
                          </span>
                        </span>

                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                            Active maintenant
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="flex items-center gap-1.5">
                          <Globe size={14} className="text-gray-400" />
                          {session.ip}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-400" />
                          {session.city ? `${session.city}, ${session.country}` : "Oyo, Congo"}
                          <span className="ml-1">
                            {/* Drapeau dynamique basé sur countryCode ou Congo par défaut */}
                            {getFlagEmoji(session.countryCode || "CG")}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-gray-400" />
                          {formatDistanceToNow(new Date(session.lastActiveAt), {
                            addSuffix: true,
                            locale: fr
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action : Pulse si actuel, bouton de révocation sinon */}
                  {isCurrent ? (
                    <div className="hidden md:block mr-2">
                       <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                    </div>
                  ) : (
                    <RevokeSessionButton sessionId={session.id} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Note de sécurité */}
      <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex gap-4 items-start">
        <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-amber-500">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900">Conseil de sécurité</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Si vous remarquez une activité suspecte ou un appareil que vous ne reconnaissez pas,
            utilisez le bouton <strong>Déconnexion globale</strong> et changez immédiatement votre code PIN.
          </p>
        </div>
      </div>
    </div>
  );
}
