import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { ref: string } }
) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { reference: params.ref },
      include: { 
        fromUser: {
          include: { wallets: true } // Pour avoir le solde actuel aussi
        }
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
