import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import { NextResponse } from "next/server";

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return await prisma.user.findUnique({
      where: { id: payload.id as string },
      include: { virtualCards: true },
    });
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
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
