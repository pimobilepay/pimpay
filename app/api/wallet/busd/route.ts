import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // On récupère l'utilisateur et sa clé EVM maître
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sidraAddress: true, walletPrivateKey: true }
    });

    if (!user || !user.sidraAddress) {
      return NextResponse.json({ error: "Générez d'abord votre adresse principale" }, { status: 400 });
    }

    // On renvoie l'adresse EVM (partagée par USDC, DAI, BUSD sur PimPay)
    return NextResponse.json({
      address: user.sidraAddress,
      network: "EVM (ERC20/BEP20)",
      success: true
    });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
