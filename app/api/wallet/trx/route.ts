import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TronWeb from "tronweb";

// Force la route à être calculée à chaque requête (indispensable pour les sessions)
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Génération du compte Tron
    const account = await TronWeb.createAccount();

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
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
