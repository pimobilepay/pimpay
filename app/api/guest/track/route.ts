export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  GUEST_COOKIE,
  guestCookieOptions,
  newGuestId,
  readGuestId,
  detectBrowser,
  detectOS,
  detectDevice,
} from "@/lib/guest-session";

function extractHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST /api/guest/track
// ---------------------------------------------------------------------------
// Enregistre (ou met à jour) la trace d'un VISITEUR NON connecté dès qu'il
// arrive sur la plateforme (ex: page de chat Elara en mode invité). Ainsi un
// invité laisse une trace même s'il n'envoie jamais de message.
//   - Utilisateur connecté → ignoré (déjà tracé via UserActivity).
//   - Invité → upsert d'une GuestSession identifiée par son cookie opaque.
export async function POST(req: NextRequest) {
  try {
    // Un utilisateur authentifié n'est pas un invité : on ne le trace pas ici.
    const user = await auth().catch(() => null);
    if (user?.id) {
      return NextResponse.json({ tracked: false, reason: "authenticated" });
    }

    // Anti-abus : limite le nombre d'enregistrements par IP.
    const ip = getClientIp(req);
    const { limited } = checkRateLimit(`guest-track:${ip}`, 30, 60_000);
    if (limited) {
      return NextResponse.json({ tracked: false, reason: "rate_limited" }, { status: 429 });
    }

    // Identifiant invité stable (cookie httpOnly) — créé si absent.
    let guestId = await readGuestId();
    let newGuestCookie: string | null = null;
    if (!guestId) {
      guestId = newGuestId();
      newGuestCookie = guestId;
    }

    const body = await req.json().catch(() => ({}));
    const page = typeof body?.page === "string" ? body.page.slice(0, 255) : "/chat";

    const userAgent = (req.headers.get("user-agent") || "").slice(0, 500);
    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      extractHost(req.headers.get("origin")) ||
      extractHost(req.headers.get("referer")) ||
      null;
    const origin = req.headers.get("origin") || extractHost(req.headers.get("referer")) || null;
    const referrer = req.headers.get("referer") || null;
    const country = req.headers.get("x-vercel-ip-country") || null;
    const city = req.headers.get("x-vercel-ip-city")
      ? decodeURIComponent(req.headers.get("x-vercel-ip-city") as string)
      : null;

    const common = {
      ip,
      userAgent,
      device: detectDevice(userAgent),
      browser: detectBrowser(userAgent),
      os: detectOS(userAgent),
      country,
      city,
      page,
      host: host ? host.slice(0, 255) : null,
      origin: origin ? origin.slice(0, 255) : null,
      referrer: referrer ? referrer.slice(0, 500) : null,
      lastSeenAt: new Date(),
    };

    // Upsert : nouvelle visite => visitCount + 1 ; première fois => création.
    await prisma.guestSession.upsert({
      where: { guestId },
      update: { ...common, visitCount: { increment: 1 } },
      create: { guestId, ...common },
    });

    const res = NextResponse.json({ tracked: true });
    if (newGuestCookie) {
      res.cookies.set(GUEST_COOKIE, newGuestCookie, guestCookieOptions());
    }
    return res;
  } catch (error) {
    console.error("GUEST_TRACK_ERROR:", error);
    // Le tracking ne doit jamais bloquer le visiteur : on renvoie 200.
    return NextResponse.json({ tracked: false, reason: "error" });
  }
}
