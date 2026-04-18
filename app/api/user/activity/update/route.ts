export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { activityId, duration, scrollDepth, clicks } = body;

    if (!activityId) {
      return NextResponse.json({ error: "Activity ID requis" }, { status: 400 });
    }

    await prisma.userActivity.update({
      where: { id: activityId },
      data: {
        duration: duration || 0,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[USER_ACTIVITY_UPDATE_ERROR]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour de l'activite" },
      { status: 500 }
    );
  }
}
