import { NextRequest, NextResponse } from "next/server";
import { pusherServer, VOIP_EVENTS } from "@/lib/pusher-server";
import { logSystemEvent } from "@/lib/systemLogger";

const VOIP_CHANNEL = "presence-cache-voip";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    // Validate event type
    const validEvents = Object.values(VOIP_EVENTS);
    if (!validEvents.includes(event)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Trigger the event on the VoIP channel
    await pusherServer.trigger(VOIP_CHANNEL, event, {
      ...data,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("[VoIP API] Error:", error);

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Log server-side VoIP failures to admin system logs
    await logSystemEvent({
      level: "ERROR",
      source: "VOIP",
      action: "SIGNALING_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Échec de l'événement de signalisation VoIP",
      ip,
      userAgent: request.headers.get("user-agent") || null,
      details: {
        errorName: error instanceof Error ? error.name : "UnknownError",
        origin: request.headers.get("origin"),
      },
    });

    return NextResponse.json(
      { error: "Failed to process VoIP event" },
      { status: 500 }
    );
  }
}
