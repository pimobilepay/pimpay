import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { getAuthUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // [FIX V5] — Vérifier que le demandeur est authentifié avant d'émettre une autorisation Pusher
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const formData = await request.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    // [FIX V5] — Valider que le canal demandé correspond à l'utilisateur authentifié.
    // Ex: "private-user-<userId>" ou "presence-<userId>" ne doit être accordé qu'à ce userId.
    const channelUserMatch = channelName.match(/(?:private|presence)-user-(.+)/);
    if (channelUserMatch && channelUserMatch[1] !== userId) {
      return NextResponse.json(
        { error: "Accès au canal refusé" },
        { status: 403 }
      );
    }

    // For presence channels, we need to provide user data
    if (channelName.startsWith("presence-")) {
      const presenceData = {
        user_id: userId,
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
