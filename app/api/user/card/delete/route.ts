export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function DELETE(req: NextRequest) {
  try {
    // 1. Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);

    if (!payload.id) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // 2. Get card ID from request body
    const { cardId } = await req.json();

    if (!cardId) {
      return NextResponse.json({ error: "ID de carte manquant" }, { status: 400 });
    }

    // 3. Verify the card belongs to the user
    const card = await prisma.virtualCard.findFirst({
      where: {
        id: cardId,
        userId: payload.id as string,
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Carte non trouvee ou vous n'avez pas les droits" },
        { status: 404 }
      );
    }

    // 4. Check if card has any pending transactions (optional safety check)
    // You can add additional checks here if needed

    // 5. Delete the card
    await prisma.virtualCard.delete({
      where: {
        id: cardId,
      },
    });

    // 6. Create a notification for the user
    try {
      await prisma.notification.create({
        data: {
          userId: payload.id as string,
          title: "Carte supprimee",
          message: `Votre carte virtuelle se terminant par ${card.number.slice(-4)} a ete supprimee avec succes.`,
          type: "CARD",
          read: false,
        },
      });
    } catch (notifError) {
      // Don't fail if notification creation fails
      console.error("Failed to create notification:", notifError);
    }

    return NextResponse.json({
      success: true,
      message: "Carte supprimee avec succes",
    });

  } catch (error: unknown) {
    console.error("DELETE_CARD_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la carte" },
      { status: 500 }
    );
  }
}
