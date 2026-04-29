import { NextRequest, NextResponse } from "next/server";
import { logSystemEvent } from "@/lib/systemLogger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      action,
      userId,
      errorMessage,
      errorName,
      errorStack,
      userAgent,
      platform,
      timestamp,
      targetUserId,
      hasMicPermission,
    } = body;

    // Récupérer l'IP de l'utilisateur depuis les headers
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    await logSystemEvent({
      level: "ERROR",
      source: "VOIP",
      action: action || "WEBRTC_ERROR",
      message: errorMessage || "Erreur inconnue lors de l'appel VoIP",
      ip,
      userAgent: userAgent || request.headers.get("user-agent") || null,
      userId: userId || null,
      details: {
        errorName,
        errorMessage,
        errorStack,
        targetUserId,
        hasMicPermission,
        platform,
        timestamp,
        // Infos navigateur supplémentaires depuis le user-agent serveur
        serverUserAgent: request.headers.get("user-agent"),
        origin: request.headers.get("origin"),
        referer: request.headers.get("referer"),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VoIP Log Error API]", error);
    // On retourne 200 quand même pour ne pas bloquer le client
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
