import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const hashedPin = await bcrypt.hash("1234", 12);
  // Remplace l'ID par le tien ou cible le premier utilisateur pour le test
  await prisma.user.updateMany({
    data: { pin: hashedPin }
  });
  return NextResponse.json({ message: "Tous les PIN sont maintenant : 1234" });
}
