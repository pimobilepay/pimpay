import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Ton instance Prisma

export async function POST(request: Request) {
  const { paymentId, userId, amount } = await request.json();

  // 1. Ici, on devrait normalement vérifier auprès de Pi Network 
  // que le paymentId est valide (via leur API de plateforme).

  // 2. Si c'est bon, on met à jour le solde de l'utilisateur dans la DB
  await prisma.user.update({
    where: { id: userId },
    data: { 
      balance: { increment: amount } 
    }
  });

  return NextResponse.json({ message: "Paiement approuvé et solde mis à jour" });
}
