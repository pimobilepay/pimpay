export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification (On utilise le nouveau adminAuth qui renvoie payload ou null)
    const payload = adminAuth(req);
    
    // Si adminAuth renvoie null ou une réponse d'erreur, on bloque
    if (!payload || (payload instanceof NextResponse)) {
      return payload || NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { userId, action, amount } = await req.json();
    const adminId = (payload as any).id;

    // 2. Récupération des données
    const [adminUser, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: adminId } }),
      prisma.user.findUnique({
        where: { id: userId },
        include: { wallets: { where: { type: "PI" } } }
      })
    ]);

    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Initialisation des variables pour la transaction
    let operations: any[] = [];
    let notifTitle = "";
    let notifMessage = "";
    let notifType = "info";
    let logDetails = "";

    // 3. Logique selon l'action
    switch (action) {
      case 'BAN':
        operations.push(prisma.user.update({
          where: { id: userId },
          data: { status: 'BANNED' },
        }));
        notifTitle = "Compte Restreint";
        notifMessage = "Votre compte a été suspendu par l'administration.";
        notifType = "error";
        logDetails = `L'admin a banni ${targetUser.email}`;
        break;

      case 'VERIFY':
        operations.push(prisma.user.update({
          where: { id: userId },
          data: { status: 'ACTIVE', kycStatus: 'VERIFIED' },
        }));
        notifTitle = "KYC Approuvé ! 🎉";
        notifMessage = "Félicitations, votre identité a été vérifiée avec succès.";
        notifType = "success";
        logDetails = `L'admin a vérifié le KYC de ${targetUser.email}`;
        break;

      case 'UPDATE_BALANCE':
        const piWallet = targetUser.wallets[0];
        if (!piWallet) {
          return NextResponse.json({ error: "Wallet PI non trouvé" }, { status: 404 });
        }
        const adjustment = parseFloat(amount || "0");
        const newBalance = piWallet.balance + adjustment;

        operations.push(prisma.wallet.update({
          where: { id: piWallet.id },
          data: { balance: newBalance },
        }));

        notifTitle = "Mise à jour du solde 💰";
        notifMessage = `Votre solde a été ajusté de ${adjustment > 0 ? '+' : ''}${adjustment} PI. Nouveau solde : ${newBalance} PI.`;
        notifType = "info";
        logDetails = `L'admin a modifié le solde de ${targetUser.email} (${adjustment > 0 ? '+' : ''}${adjustment} PI)`;
        break;

      default:
        return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
    }

    // 4. Ajout des logs et notifications dans la transaction
    operations.push(
      prisma.auditLog.create({
        data: {
          adminId: adminId,
          adminName: adminUser?.name || "Admin",
          action: action,
          targetId: targetUser.id,
          targetEmail: targetUser.email || "Unknown",
          details: logDetails,
        }
      })
    );

    // Note : On s'assure que le modèle 'notification' existe dans schema.prisma
    operations.push(
      prisma.notification.create({
        data: {
          userId: userId,
          title: notifTitle,
          message: notifMessage,
          type: notifType,
        }
      })
    );

    // 5. Exécution atomique
    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, message: `Action ${action} réussie` });

  } catch (error) {
    console.error("ADMIN_ACTION_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur serveur. Vérifiez que le modèle Notification existe dans Prisma." }, 
      { status: 500 }
    );
  }
}
