export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    const JWT_SECRET = process.env.JWT_SECRET;

    // 1. AUTHENTIFICATION SÉCURISÉE
    let userId = null;
    if (token) {
      try {
        const secretKey = new TextEncoder().encode(JWT_SECRET || "");
        const { payload } = await jwtVerify(token, secretKey);
        userId = payload.id as string;
      } catch (e) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
    }

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION DES DONNÉES ENTRANTES
    // On ne met plus 1.06 en dur. On attend que le client envoie le solde réel détecté.
    const body = await req.json().catch(() => ({}));
    const { realBlockchainBalance } = body; 

    if (realBlockchainBalance === undefined) {
      return NextResponse.json({ error: "Aucun solde blockchain fourni" }, { status: 400 });
    }

    // 3. VÉRIFICATION DU WALLET
    const walletSDA = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: "SDA" } }
    });

    if (!walletSDA) return NextResponse.json({ error: "Wallet Sidra non trouvé" }, { status: 404 });

    // 4. CALCUL DE LA DIFFÉRENCE
    const difference = realBlockchainBalance - walletSDA.balance;

    // Sécurité : On ne synchronise que si le gain est positif
    if (difference > 0.000001) {
      const result = await prisma.$transaction(async (tx) => {
        // Vérifier si une synchro a déjà eu lieu il y a moins de 5 minutes (Anti-spam)
        const recentSync = await tx.transaction.findFirst({
          where: {
            toUserId: userId,
            currency: "SDA",
            metadata: { path: ["method"], equals: "auto_sync" },
            createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
          }
        });

        if (recentSync) {
          throw new Error("Veuillez attendre entre deux synchronisations");
        }

        // Mise à jour du solde Wallet
        await tx.wallet.update({
          where: { id: walletSDA.id },
          data: { balance: { increment: difference } }
        });

        // Création du log de transaction
        return await tx.transaction.create({
          data: {
            reference: `SDA-SYNC-${uuidv4().slice(0, 8).toUpperCase()}`,
            amount: difference,
            currency: "SDA",
            type: "DEPOSIT",
            status: "SUCCESS",
            description: "Synchronisation Sidra Chain",
            toUserId: userId,
            metadata: { method: "auto_sync", syncedAt: new Date().toISOString() }
          }
        });
      });

      return NextResponse.json({ success: true, added: difference });
    }

    return NextResponse.json({ success: true, message: "Le solde est déjà à jour" });

  } catch (error: any) {
    console.error("❌ [SIDRA_SYNC_ERROR]:", error.message);
    return NextResponse.json({ error: error.message || "Erreur synchro" }, { status: 500 });
  }
}
