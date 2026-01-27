export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
// Suppression de l'import qrcode pour éliminer la dépendance
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // 1. Récupérer l'utilisateur via la session
    const session = await auth() as any;
    const userId = session?.id;

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Générer un identifiant unique de dépôt (Mémo)
    const depositMemo = `PIMPAY-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // 3. Adresse du Master Wallet (depuis les variables d'environnement)
    const masterWalletAddress = process.env.PI_MASTER_WALLET_ADDRESS || "ADRESSE_PAR_DEFAUT";

    // 4. Créer le lien de paiement standard Pi
    const paymentUrl = `pi://payment?recipient=${masterWalletAddress}&amount=0&memo=${depositMemo}`;

    // NOTE : On ne génère plus le QR Code ici (DataURL) pour alléger l'API.
    // Le frontend utilisera <QRCodeSVG value={paymentUrl} />

    // 5. Sauvegarder dans la base de données
    await prisma.wallet.update({
      where: {
        userId_currency: {
          userId: userId,
          currency: "PI"
        }
      },
      data: {
        // Optionnel : tu peux stocker le mémo ici si ton schéma Prisma le permet
        // depositMemo: depositMemo 
      }
    });

    return NextResponse.json({
      depositMemo,
      paymentUrl // C'est cette URL que tu passeras à ton composant QRCodeSVG au front-end
    });

  } catch (error: any) {
    console.error("GENERATE_QR_ERROR:", error.message);
    return NextResponse.json(
      { error: "Erreur lors de la génération du dépôt" },
      { status: 500 }
    );
  }
}
