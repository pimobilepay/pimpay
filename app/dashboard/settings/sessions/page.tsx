// ============================================================================
// SessionsPage.tsx — PimPay Security · Sessions Management
// Next.js App Router Server Component (RSC)
// Redesigned with a polished, professional dark UI
// ============================================================================

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import {
  ArrowLeft,
  Smartphone,
  Monitor,
  Globe,
  Clock,
  MapPin,
  Wifi,
  Fingerprint,
  AlertTriangle,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import LogoutOthersButton from "@/components/sessions/LogoutOthersButton";
import RevokeSessionButton from "@/components/sessions/RevokeSessionButton";
import "flag-icons/css/flag-icons.min.css";

// ============================================================================
// Country Flag — renders a flag-icons sprite for a given country code
// ============================================================================

function CountryFlag({ countryCode }: { countryCode: string | null }) {
  if (!countryCode) return null;
  const code = countryCode.toLowerCase();
  return (
    <span
      className={`fi fi-${code}`}
      style={{"display":"inline-block","width":"16px","height":"12px","borderRadius":"2px","boxShadow":"0 0 0 1px rgba(255,255,255,0.08)"}}
      title={countryCode.toUpperCase()}
    />
  );
}

// ============================================================================
// Device icon helper — returns the appropriate Lucide icon per device type
// ============================================================================

function DeviceIcon({
  deviceType,
  isCurrent,
}: {
  deviceType: string | null;
  isCurrent: boolean;
}) {
  const Icon = deviceType === "mobile" ? Smartphone : Monitor;
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
        isCurrent
          ? "bg-blue-600/15 text-blue-400 shadow-lg shadow-blue-600/25"
          : "bg-white/[0.04] text-slate-500"
      }`}
    >
      <Icon size={18} strokeWidth={1.8} />
    </div>
  );
}

// ============================================================================
// Unauthenticated state — shown when there is no valid JWT
// ============================================================================

function UnauthenticatedState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] px-4 antialiased">
      <div className="w-full max-w-sm rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 text-center backdrop-blur-xl">
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10">
          <ShieldCheck size={24} className="text-blue-400" strokeWidth={1.6} />
        </div>

        {/* Text */}
        <h2 className="text-[17px] font-bold tracking-tight text-white">
          Session expirée
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
          Votre session a expiré ou vous n&apos;êtes pas connecté. Veuillez vous
          reconnecter pour accéder à cette page.
        </p>

        {/* Reconnect button */}
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500"
        >
          Se reconnecter
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Main page component
// ============================================================================

export default async function SessionsPage() {
  // --------------------------------------------------------------------------
  // Auth — read JWT from cookies and verify
  // --------------------------------------------------------------------------
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return <UnauthenticatedState />;

  let userId: string;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    userId = payload.sub as string;
  } catch {
    return <UnauthenticatedState />;
  }

  // --------------------------------------------------------------------------
  // Data — fetch all sessions for this user, most recent first
  // --------------------------------------------------------------------------
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { lastActiveAt: "desc" },
  });

  // Identify the current session by matching the token
  const currentSession = sessions.find((s) => s.token === token);

  return (
    <div className="min-h-screen bg-[#020617] antialiased">
      {/* ================================================================== */}
      {/* HEADER — sticky navigation bar                                     */}
      {/* ================================================================== */}
      <header className="sticky top-0 z-50 flex h-16 items-center border-b border-white/[0.04] bg-[#020617]/90 px-4 backdrop-blur-2xl">
        {/* Back button */}
        <Link
          href="/security"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </Link>

        {/* Brand */}
        <div className="ml-3.5 flex items-center gap-2">
          <span className="text-[15px] font-bold tracking-tight text-white">
            PimPay Security
          </span>
          <span className="text-[11px] text-slate-600">&middot;</span>
          <span className="text-[11px] font-medium text-slate-500">
            Sessions
          </span>
        </div>
      </header>

      {/* ================================================================== */}
      {/* CONTENT                                                            */}
      {/* ================================================================== */}
      <main className="mx-auto max-w-lg px-4 pb-12 pt-8">
        {/* ---------------------------------------------------------------- */}
        {/* HERO SECTION — title, description, counter                       */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-8">
          {/* Fingerprint icon */}
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/10">
            <Fingerprint size={20} className="text-blue-400" strokeWidth={1.6} />
          </div>

          <h1 className="text-[22px] font-bold tracking-tight text-white">
            Appareils connectés
          </h1>

          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
            Gérez les sessions actives associées à votre compte. Révoquez
            l&apos;accès pour tout appareil que vous ne reconnaissez pas.
          </p>

          {/* Session counter pill */}
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 ring-1 ring-white/[0.06]">
            <Wifi size={12} className="text-blue-400" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-slate-400">
              {sessions.length} session{sessions.length !== 1 && "s"} active
              {sessions.length !== 1 && "s"}
            </span>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* SESSION CARDS                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="flex flex-col gap-3.5">
          {sessions.map((session) => {
            const isCurrent = session.id === currentSession?.id;

            return (
              <div
                key={session.id}
                className={`relative rounded-2xl p-4 transition-colors ${
                  isCurrent
                    ? "bg-gradient-to-b from-blue-600/[0.06] to-transparent ring-1 ring-blue-500/20"
                    : "bg-white/[0.02] ring-1 ring-white/[0.06] hover:ring-white/[0.08]"
                }`}
              >
                {/* Top row — device icon, name, badge, revoke */}
                <div className="flex items-start gap-3.5">
                  <DeviceIcon
                    deviceType={session.deviceType}
                    isCurrent={isCurrent}
                  />

                  <div className="min-w-0 flex-1">
                    {/* Device name + current badge */}
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold tracking-tight text-white">
                        {session.deviceName || "Appareil inconnu"}
                      </span>

                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 ring-1 ring-emerald-500/20">
                          {/* Pulsing green dot */}
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                            Actif
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Browser / OS */}
                    <p className="mt-0.5 truncate text-[12px] text-slate-500">
                      {session.browser || "Navigateur inconnu"} &middot;{" "}
                      {session.os || "OS inconnu"}
                    </p>
                  </div>

                  {/* Revoke button (not for current session) */}
                  {!isCurrent && (
                    <RevokeSessionButton sessionId={session.id} />
                  )}
                </div>

                {/* -------------------------------------------------------- */}
                {/* Meta rows — IP, location, last active                    */}
                {/* -------------------------------------------------------- */}
                <div className="mt-3.5 flex flex-col gap-1.5 border-t border-white/[0.04] pt-3.5">
                  {/* IP address */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Globe size={12} strokeWidth={1.8} className="shrink-0" />
                    <span>{session.ip || "IP inconnue"}</span>
                  </div>

                  {/* Location */}
                  {(session.city || session.country) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <MapPin
                        size={12}
                        strokeWidth={1.8}
                        className="shrink-0"
                      />
                      <CountryFlag countryCode={session.countryCode} />
                      <span>
                        {[session.city, session.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {/* Last active */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock size={12} strokeWidth={1.8} className="shrink-0" />
                    <span>
                      {isCurrent ? "Actif \u00b7 " : ""}
                      {formatDistanceToNow(new Date(session.lastActiveAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* LOGOUT ALL OTHER SESSIONS                                       */}
        {/* ---------------------------------------------------------------- */}
        {sessions.length > 1 && (
          <div className="mt-6 flex justify-center">
            <LogoutOthersButton />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* SECURITY TIP                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-8">
          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle
                  size={14}
                  className="text-amber-400"
                  strokeWidth={2}
                />
              </div>
              <div>
                <h3 className="text-[12px] font-bold tracking-tight text-white">
                  Conseil de sécurité
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  Si vous ne reconnaissez pas un appareil, révoquez
                  immédiatement la session et changez votre mot de passe. Activez
                  l&apos;authentification à deux facteurs pour une protection
                  renforcée.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
