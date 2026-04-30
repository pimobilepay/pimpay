import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import { auth } from "@/lib/auth";
import { TronWeb } from "tronweb";

// Force la route à être calculée à chaque requête (indispensable pour les sessions)
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { usdtAddress: true }
    });
    
    return NextResponse.json({ 
      address: user?.usdtAddress || "Non configurée" 
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Génération du compte Tron
    const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
    const account = await tronWeb.createAccount();

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: {
        usdtAddress: account.address.base58,
        usdtPrivateKey: account.privateKey
      },
      select: { usdtAddress: true }
    });

    return NextResponse.json({ 
      success: true, 
      address: updatedUser.usdtAddress 
    });
  } catch (error) {
    console.error("Erreur génération TRX:", error);
    return NextResponse.json({ error: "Échec de génération TRX" }, { status: 500 });
  }
}
