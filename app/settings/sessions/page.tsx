// ============================================================================
// SessionsPage.tsx — PIMOBIPAY Security · Sessions Management
// Next.js App Router Server Component (RSC)
// Auth + data fetching happen on the server; all UI text is rendered by the
// client component SessionsView so it respects the user's selected language.
// ============================================================================

export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import SessionsContent from "@/components/sessions/SessionsContent";
import SessionsView, { type SessionData } from "@/components/sessions/SessionsView";

export default async function SessionsPage() {
  // --------------------------------------------------------------------------
  // Auth — résolution centralisée (JWT classique + Pi Browser + pimpay_token)
  // --------------------------------------------------------------------------
  const userId = await getAuthUserId();

  if (!userId) {
    return <SessionsView authenticated={false} sessions={[]} />;
  }

  // La session courante est identifiée par le REFRESH token : c'est lui qui est
  // stocké dans `session.token` en base (voir /api/auth/login). L'access token
  // du cookie `token` (15 min) ne correspond jamais à `session.token`, d'où
  // l'ancien bug où la session courante n'était jamais reconnue.
  const cookieStore = await cookies();
  const currentRefreshToken =
    cookieStore.get("refresh_token")?.value ||
    cookieStore.get("pimpay_refresh")?.value ||
    null;

  // --------------------------------------------------------------------------
  // Data — fetch all active sessions for this user, most recent first
  // --------------------------------------------------------------------------
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: { lastActiveAt: "desc" },
  });

  // Serialize to plain objects with an isCurrent flag (tokens are not exposed)
  const serializedSessions: SessionData[] = sessions.map((session) => ({
    id: session.id,
    deviceName: session.deviceName ?? null,
    userAgent: session.userAgent ?? null,
    browser: session.browser ?? null,
    os: session.os ?? null,
    deviceType: null,
    ip: session.ip ?? null,
    city: session.city ?? null,
    region: null,
    country: session.country ?? null,
    lastActiveAt: new Date(session.lastActiveAt).toISOString(),
    isCurrent: !!currentRefreshToken && session.token === currentRefreshToken,
  }));

  return (
    <SessionsContent>
      <SessionsView authenticated sessions={serializedSessions} />
    </SessionsContent>
  );
}
