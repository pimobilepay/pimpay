export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await req.json();
    const { page, action = "PAGE_VIEW" } = body;

    if (!page) {
      return NextResponse.json({ error: "Page requise" }, { status: 400 });
    }

    // Extract device info from user-agent
    const userAgent = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("x-real-ip") || 
               "unknown";

    // Simple device/browser/os detection
    const device = /mobile|android|iphone|ipad/i.test(userAgent) ? "Mobile" : "Desktop";
    const browser = extractBrowser(userAgent);
    const os = extractOS(userAgent);

    const activity = await prisma.userActivity.create({
      data: {
        userId: payload.id,
        page,
        action,
        ip,
        userAgent: userAgent.substring(0, 500),
        device,
        browser,
        os,
      },
    });

    return NextResponse.json({ success: true, activityId: activity.id });
  } catch (error) {
    console.error("[USER_ACTIVITY_ERROR]:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de l'activite" },
      { status: 500 }
    );
  }
}

function extractBrowser(ua: string): string {
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Safari";
  if (/opera|opr/i.test(ua)) return "Opera";
  return "Autre";
}

function extractOS(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Autre";
}
