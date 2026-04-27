import { NextRequest, NextResponse } from "next/server";
import { pusherServer, VOIP_EVENTS } from "@/lib/pusher-server";

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
    return NextResponse.json(
      { error: "Failed to process VoIP event" },
      { status: 500 }
    );
  }
}
