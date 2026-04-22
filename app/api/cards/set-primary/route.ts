import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getAuthUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { virtualCards: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const { cardId } = await request.json();
    if (!cardId) {
      return NextResponse.json({ error: "Card ID requis" }, { status: 400 });
    }

    // Verify the card belongs to the user
    const card = user.virtualCards.find((c) => c.id === cardId);
    if (!card) {
      return NextResponse.json({ error: "Carte non trouvee" }, { status: 404 });
    }

    // Set this card as primary by setting a cookie
    const cookieStore = await cookies();
    cookieStore.set("pimpay_primary_card", cardId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    return NextResponse.json({ success: true, cardId });
  } catch (error) {
    console.error("Error setting primary card:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
