import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { userId } = await request.json();

  // 1. Générer un identifiant unique de dépôt (Mémo)
  const depositMemo = `PIMPAY-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  // 2. L'adresse de ton Master Wallet (où tout l'argent arrive)
  const masterWalletAddress = process.env.PI_MASTER_WALLET_ADDRESS;

  // 3. Créer le lien de paiement standard Pi (pi://...)
  const paymentUrl = `pi://payment?recipient=${masterWalletAddress}&amount=0&memo=${depositMemo}`;

  // 4. Générer le QR Code en Base64
  const qrCodeDataUrl = await QRCode.toDataURL(paymentUrl);

  // 5. Sauvegarder le mémo dans la DB pour valider plus tard
  await prisma.wallet.update({
    where: { userId },
    data: { depositMemo }
  });

  return NextResponse.json({ qrCodeDataUrl, depositMemo });
}
