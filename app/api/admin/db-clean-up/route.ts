export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    // 1. RÉCUPÉRATION DE LA CLÉ DE SÉCURITÉ DANS L'URL
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    
    // Définis ta clé secrète ici (ou mieux, dans ton .env)
    const ADMIN_SECRET_KEY = process.env.ADMIN_CLEANUP_KEY || "pimpay_master_2026";

    if (key !== ADMIN_SECRET_KEY) {
      console.warn("⚠️ Tentative d'accès non autorisée au nettoyage DB");
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. NETTOYAGE DES TRANSACTIONS FANTÔMES
    // On supprime les PENDING qui bloquent le flux Pi Network
    const deletedTransactions = await prisma.transaction.deleteMany({
      where: {
        status: "PENDING"
      }
    });

    // 3. RÉINITIALISATION DES SOLDES DE TEST (Si nécessaire)
    // Utile pour tester si le graphique remonte bien de 0 à X
    /*
    await prisma.wallet.updateMany({
       where: { currency: "PI" },
       data: { balance: 0 }
    });
    */

    console.log(`✅ [DB_CLEANUP]: ${deletedTransactions.count} transactions supprimées.`);

    return NextResponse.json({
      success: true,
      message: "Nettoyage PimPay effectué",
      details: {
        deletedPending: deletedTransactions.count,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("❌ [DB_CLEANUP_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
