export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth"; // Assure-toi que c'est le bon import
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification sécurisée
    const payload = verifyAuth(req) as { id: string; role: string } | null;

    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }                                             
    
    const { userId, action, amount, extraData } = await req.json();
    const adminId = payload.id;

    // 2. Récupération des données admin et cible
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

    // Initialisation pour la transaction atomique
    let operations: any[] = [];
    let notifTitle = "";
    let notifMessage = "";
    let notifType = "info";
    let logDetails = "";

    // 3. Logique étendue selon l'action
    switch (action) {
      case 'BAN':
        const isBanned = targetUser.status === 'BANNED';
        operations.push(prisma.user.update({
          where: { id: userId },
          data: { status: isBanned ? 'ACTIVE' : 'BANNED' },
        }));
        notifTitle = isBanned ? "Compte Réactivé" : "Compte Restreint";
        notifMessage = isBanned ? "Votre compte est de nouveau actif." : "Votre compte a été suspendu par l'administration.";
        notifType = isBanned ? "success" : "error";
        logDetails = `L'admin a ${isBanned ? 'débloqué' : 'banni'} ${targetUser.email}`;
        break;

      case 'VERIFY':
        operations.push(prisma.user.update({
          where: { id: userId },
          data: { status: 'ACTIVE', kycStatus: 'VERIFIED', kycVerifiedAt: new Date() },
        }));
        notifTitle = "KYC Approuvé ! 🎉";
        notifMessage = "Félicitations, votre identité a été vérifiée avec succès.";
        notifType = "success";
        logDetails = `L'admin a vérifié le KYC de ${targetUser.email}`;
        break;

      case 'UPDATE_BALANCE':
        const piWallet = targetUser.wallets[0];
        if (!piWallet) return NextResponse.json({ error: "Wallet PI non trouvé" }, { status: 404 });
        
        const adjustment = parseFloat(amount || "0");
        operations.push(prisma.wallet.update({
          where: { id: piWallet.id },
          data: { balance: { increment: adjustment } },
        }));
        notifTitle = "Mise à jour du solde 💰";
        notifMessage = `Votre solde a été ajusté de ${adjustment > 0 ? '+' : ''}${adjustment} PI.`;
        logDetails = `Ajustement solde de ${targetUser.email}: ${adjustment > 0 ? '+' : ''}${adjustment} PI`;
        break;

      case 'RESET_PASSWORD':
        if (!extraData || extraData.length < 8) return NextResponse.json({ error: "Mot de passe invalide" }, { status: 400 });
        const hashedPass = await bcrypt.hash(extraData, 10);
        operations.push(prisma.user.update({
          where: { id: userId },
          data: { password: hashedPass },
        }));
        notifTitle = "Sécurité Mise à Jour";
        notifMessage = "Votre mot de passe a été réinitialisé par un administrateur.";
        logDetails = `Réinitialisation mot de passe pour ${targetUser.email}`;
        break;

      case 'TOGGLE_ROLE':
        const newRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
        operations.push(prisma.user.update({
          where: { id: userId },
          data: { role: newRole },
        }));
        notifTitle = "Changement de rang";
        notifMessage = `Votre compte a été promu au rang : ${newRole}.`;
        logDetails = `Changement rôle de ${targetUser.email} vers ${newRole}`;
        break;

      default:
        return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
    }

    // 4. Audit Log
    operations.push(
      prisma.auditLog.create({
        data: {
          adminName: adminUser?.name || "Admin",
          action: action,
          targetEmail: targetUser.email || "Unknown",
          // Si ton modèle AuditLog a ces champs, sinon utilise ceux de ton schéma
          // details: logDetails, 
        }
      })
    );

    // 5. Notification
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

    // 6. Exécution atomique (Tout réussit ou tout échoue)
    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, message: `Action ${action} effectuée` });

  } catch (error: any) {
    console.error("ADMIN_ACTION_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors de l'exécution de l'action" }, { status: 500 });
  }
}
