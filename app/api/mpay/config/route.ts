export const dynamic = 'force-dynamic';
// CORRECTION : import depuis next/server et non next/navigation
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, amount, method, txid, userId } = body;

    // 1. Validation de base
    if (!amount || amount <= 0 || !userId) {
      return NextResponse.json({ success: false, message: "Données invalides" }, { status: 400 });
    }

    // 2. Récupération réelle de l'utilisateur et ses wallets via Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: true, virtualCards: true }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable" }, { status: 404 });
    }

    const piWallet = user.wallets.find(w => w.currency === "PI");
    const userBalancePi = piWallet?.balance || 0;

    // 3. Traitement selon la méthode choisie
    switch (method) {
      case "wallet":
        if (userBalancePi < amount) {
          return NextResponse.json({ success: false, message: "Solde Pi insuffisant" }, { status: 400 });
        }
        // La logique de débit se ferait ici via une transaction Prisma
        break;

      case "card":
        // On vérifie si l'utilisateur a une carte active
        const activeCard = user.virtualCards.find(c => !c.isFrozen);
        if (!activeCard) {
          return NextResponse.json({ success: false, message: "Aucune carte active" }, { status: 400 });
        }
        // Dans ton schéma, le solde est souvent dans le wallet, pas la carte directement
        break;

      case "external":
        return NextResponse.json({
          success: true,
          externalRequired: true,
          message: "Redirection vers Pi Wallet..."
        });

      default:
        return NextResponse.json({ success: false, message: "Méthode inconnue" }, { status: 400 });
    }

    // 4. Enregistrement de la transaction (Décommenté et adapté à ton schéma)
    const newTx = await prisma.transaction.create({
      data: {
        reference: txid || `MPAY-${Math.random().toString(36).substring(7).toUpperCase()}`,
        amount: parseFloat(amount),
        status: "COMPLETED",
        type: "PAYMENT",
        fromUserId: userId,
        description: `Paiement via ${method} vers ${to}`,
        metadata: { method, target: to }
      }
    });

    // 5. Réponse de succès
    return NextResponse.json({
      success: true,
      message: "Paiement confirmé",
      transactionId: newTx.id
    });

  } catch (error: any) {
    console.error("Erreur API Payment:", error);
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}
