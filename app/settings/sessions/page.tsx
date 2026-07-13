// ============================================================================
// SessionsPage.tsx — PIMOBIPAY Security · Sessions Management
// Next.js App Router Server Component (RSC)
// Auth + data fetching happen on the server; all UI text is rendered by the
// client component SessionsView so it respects the user's selected language.
// ============================================================================

import { cookies } from "next/headers";
import * as jose from "jose";
import { prisma } from "@/lib/prisma";
import SessionsContent from "@/components/sessions/SessionsContent";
import SessionsView, { type SessionData } from "@/components/sessions/SessionsView";

export default async function SessionsPage() {
  // --------------------------------------------------------------------------
  // Auth — read JWT from cookies and verify
  // --------------------------------------------------------------------------
  const cookieStore = await cookies();
  const currentToken = cookieStore.get("token")?.value;

  if (!currentToken) {
    return <SessionsView authenticated={false} sessions={[]} />;
  }

  let userId: string;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(currentToken, secret);
    userId = payload.id as string;
  } catch {
    return <SessionsView authenticated={false} sessions={[]} />;
  }

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
    isCurrent: session.token === currentToken,
  }));

  return (
    <SessionsContent>
      <SessionsView authenticated sessions={serializedSessions} />
    </SessionsContent>
  );
}
