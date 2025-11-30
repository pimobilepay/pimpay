import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromToken } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromToken();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let card = await prisma.virtualCard.findUnique({
    where: { userId },
  });

  if (!card) {
    // Création automatique si pas de carte
    card = await prisma.virtualCard.create({
      data: {
        userId,
        number: "411111111111" + (Math.floor(1000 + Math.random() * 9000)),
        exp: "12/28",
        holder: "USER",
      },
    });
  }

  return NextResponse.json(card);
}