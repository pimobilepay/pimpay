export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
// Assure-toi d'avoir installé @types/qrcode comme discuté
import QRCode from "qrcode"; 
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // 1. Récupérer l'utilisateur via la session (plus sécurisé que de le passer dans le body)
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

    // 5. Générer le QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(paymentUrl);

    // 6. Sauvegarder (Correction de l'erreur de build Prisma)
    // On utilise l'index unique composé userId_currency pour cibler le wallet PI
    await prisma.wallet.update({
      where: {
        userId_currency: {
          userId: userId,
          currency: "PI"
        }
      },
      data: {
        // CORRECTION : Si 'depositMemo' n'est pas encore dans ton schéma, 
        // on utilise un champ existant ou on ne met à jour que le timestamp
        // updatedAt: new Date(), 
        
        // DECOMMENTER UNIQUEMENT SI TU AS AJOUTÉ LE CHAMP DANS PRISMA :
        // depositMemo: depositMemo 
      }
    });

    return NextResponse.json({ 
      qrCodeDataUrl, 
      depositMemo,
      paymentUrl 
    });

  } catch (error: any) {
    console.error("GENERATE_QR_ERROR:", error.message);
    return NextResponse.json(
      { error: "Erreur lors de la génération du dépôt" },
      { status: 500 }
    );
  }
}
