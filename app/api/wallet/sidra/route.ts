import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as jose from "jose";
import { Wallet } from "ethers";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("cookie")
      ?.split("; ")
      .find(row => row.startsWith("token="))
      ?.split("=")[1];

    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    // 1. VERIFICATION STRICTE : On ne génère JAMAIS si une adresse existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sidraAddress: true }
    });

    if (user?.sidraAddress) {
      return NextResponse.json({
        address: user.sidraAddress,
        message: "Adresse existante"
      });
    }

    // 2. Génération unique
    const wallet = Wallet.createRandom();

    // 3. Transaction atomique
    const result = await prisma.$transaction(async (tx) => {
      // Sauvegarde des clés sur l'utilisateur
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          sidraAddress: wallet.address,
          sidraPrivateKey: wallet.privateKey
        },
        select: { sidraAddress: true }
      });

      // Création forcée du Wallet SDA pour l'affichage
      await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "SDA" } },
        update: {},
        create: {
          userId: userId,
          currency: "SDA",
          type: "SIDRA",
          balance: 0,
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      address: result.sidraAddress,
      message: "Nouvelle adresse générée"
    });

  } catch (error: any) {
    console.error("[SIDRA_GEN_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur lors de la création du wallet Sidra" }, { status: 500 });
  }
}
