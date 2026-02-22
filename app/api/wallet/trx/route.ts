import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TronWeb from "tronweb"; // N'oublie pas d'installer tronweb

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { usdtAddress: true }
    });
    return NextResponse.json({ address: user?.usdtAddress || "Non configurée" });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // TronWeb pour générer une adresse TRX/TRC20
    const account = await TronWeb.createAccount();

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        usdtAddress: account.address.base58,
        usdtPrivateKey: account.privateKey
      }
    });

    return NextResponse.json({ success: true, address: updatedUser.usdtAddress });
  } catch (error) {
    return NextResponse.json({ error: "Échec de génération TRX" }, { status: 500 });
  }
}
