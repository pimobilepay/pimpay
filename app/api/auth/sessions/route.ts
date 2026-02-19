export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import { UAParser } from "ua-parser-js";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    const sessions = await prisma.session.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActiveAt: "desc" },
    });

    const enriched = sessions.map((s) => {
      const parser = new UAParser(s.userAgent || "");
      const device = parser.getDevice();
      const os = parser.getOS();
      const browser = parser.getBrowser();

      // Build a smart display name
      const deviceDisplayName =
        s.deviceName && s.deviceName !== "Desktop" && s.deviceName !== "iPhone" && s.deviceName !== "Android"
          ? s.deviceName
          : device.model
            ? `${device.vendor || ""} ${device.model}`.trim()
            : os.name
              ? `${browser.name || "Navigateur"} sur ${os.name}`
              : s.deviceName || "Appareil Inconnu";

      const isMobile =
        device.type === "mobile" ||
        s.deviceName?.toLowerCase().includes("android") ||
        s.deviceName?.toLowerCase().includes("iphone") ||
        s.userAgent?.toLowerCase().includes("mobile");

      return {
        id: s.id,
        deviceName: deviceDisplayName,
        os: s.os || `${os.name || "Unknown"} ${os.version || ""}`.trim(),
        browser: s.browser || browser.name || "Navigateur",
        ip: s.ip || "127.0.0.1",
        city: s.city || null,
        country: s.country || null,
        isMobile: !!isMobile,
        lastActiveAt: s.lastActiveAt.toISOString(),
        isCurrent: s.token === token,
      };
    });

    return NextResponse.json({ sessions: enriched });
  } catch (e) {
    console.error("SESSIONS_API_ERROR:", e);
    return NextResponse.json(
      { error: "Session expiree ou invalide" },
      { status: 401 }
    );
  }
}
