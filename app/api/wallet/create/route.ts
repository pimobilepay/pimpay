export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import crypto from "crypto";

// Simulation DB (à remplacer par Prisma)
const wallets = new Map();

function generateWalletAddress() {
  return "PIMPAY-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId is required" },
        { status: 400 }
      );
    }

    // Vérifier si wallet existe déjà
    if (wallets.has(userId)) {
      return NextResponse.json(
        { success: false, message: "Wallet already exists" },
        { status: 409 }
      );
    }

    const wallet = {
      id: crypto.randomUUID(),
      userId,
      address: generateWalletAddress(),
      balance: 0,
      currency: "PI",
      createdAt: new Date().toISOString(),
    };

    wallets.set(userId, wallet);

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
