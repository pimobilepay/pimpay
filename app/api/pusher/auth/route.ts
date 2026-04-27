import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    // Generate a unique user ID (in production, use actual auth)
    const uniqueUserId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // For presence channels, we need to provide user data
    if (channelName.startsWith("presence-")) {
      const presenceData = {
        user_id: uniqueUserId,
        user_info: {
          name: "PimPay User",
          role: "customer",
        },
      };

      const auth = pusherServer.authorizeChannel(socketId, channelName, presenceData);
      return NextResponse.json(auth);
    }

    // For private channels
    const auth = pusherServer.authorizeChannel(socketId, channelName);
    return NextResponse.json(auth);
  } catch (error) {
    console.error("[Pusher Auth] Error:", error);
    return NextResponse.json(
      { error: "Failed to authorize channel" },
      { status: 500 }
    );
  }
}
