export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { UserStatus, UserRole } from "@prisma/client";

/**
 * API ADMINISTRATIVE PIMPAY CORE
 * Gère les utilisateurs, la finance et la configuration système.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTIFICATION & SÉCURITÉ
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    // Vérification de l'existence et du rôle de l'admin
    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true }
    });

    if (!requester || requester.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Privilèges insuffisants" }, { status: 403 });
    }

    // 2. EXTRACTION ET PARSING DU BODY
    const body = await req.json();
    const { userId: targetUserId, action, amount, extraData, transactionId, newSecret, userIds } = body;

    if (!action) return NextResponse.json({ error: "Action manquante" }, { status: 400 });

    // 3. LOGIQUE DES ACTIONS (Basée sur le Schéma Prisma)
    switch (action) {
      
      // RÉINITIALISATION MOT DE PASSE
      case "RESET_PASSWORD":
        if (!targetUserId || !newSecret) return NextResponse.json({ error: "ID ou secret manquant" }, { status: 400 });
        const hashedPw = await bcrypt.hash(newSecret, 10);
        await prisma.user.update({
          where: { id: targetUserId },
          data: { password: hashedPw }
        });
        break;

      // RÉINITIALISATION CODE PIN (Corrigé selon ton Schéma: champ "pin")
      case "RESET_PIN":
        if (!targetUserId || !newSecret) return NextResponse.json({ error: "ID ou PIN manquant" }, { status: 400 });
        const hashedPin = await bcrypt.hash(newSecret, 10);
        await prisma.user.update({
          where: { id: targetUserId },
          data: { pin: hashedPin } // Utilise le champ 'pin' défini dans ton Prisma
        });
        break;

      // MAINTENANCE SYSTÈME INSTANTANÉE
      case "TOGGLE_MAINTENANCE":
        const current = await prisma.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: { maintenanceMode: !current?.maintenanceMode },
          create: { id: "GLOBAL_CONFIG", maintenanceMode: true },
        });
        break;

      // VALIDATION DE DÉPÔT / RETRAIT
      case "VALIDATE_DEPOSIT": {
        if (!transactionId) return NextResponse.json({ error: "ID Transaction requis" }, { status: 400 });
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });

        if (!tx || tx.status !== "PENDING") {
          return NextResponse.json({ error: "Transaction introuvable ou déjà traitée" }, { status: 400 });
        }

        // Pour les dépôts Pi Browser, l'utilisateur est dans toUserId
        // Pour les dépôts manuels/retraits, l'utilisateur est dans fromUserId
        const depositUserId = tx.toUserId || tx.fromUserId;
        if (!depositUserId) {
          return NextResponse.json({ error: "Impossible d'identifier l'utilisateur de la transaction" }, { status: 400 });
        }

        // Transaction atomique pour éviter les erreurs de solde
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: transactionId },
            data: { status: "SUCCESS" }
          }),
          prisma.wallet.upsert({
            where: { userId_currency: { userId: depositUserId, currency: tx.currency } },
            update: { balance: { increment: tx.amount } },
            create: { userId: depositUserId, currency: tx.currency, balance: tx.amount },
          }),
          prisma.notification.create({
            data: {
              userId: depositUserId,
              title: "Transaction Approuvée",
              message: `Votre dépôt de ${tx.amount} ${tx.currency} a été validé.`,
              type: "SUCCESS"
            }
          })
        ]);
        break;
      }

      // REJET DE DÉPÔT
      case "REJECT_DEPOSIT": {
        if (!transactionId) return NextResponse.json({ error: "ID Transaction requis" }, { status: 400 });
        const txReject = await prisma.transaction.findUnique({ where: { id: transactionId } });

        if (!txReject || txReject.status !== "PENDING") {
          return NextResponse.json({ error: "Transaction introuvable ou déjà traitée" }, { status: 400 });
        }

        const rejectUserId = txReject.toUserId || txReject.fromUserId;

        const rejectOps: any[] = [
          prisma.transaction.update({
            where: { id: transactionId },
            data: { status: "FAILED" }
          }),
        ];

        if (rejectUserId) {
          rejectOps.push(
            prisma.notification.create({
              data: {
                userId: rejectUserId,
                title: "Transaction Rejetée",
                message: `Votre dépôt de ${txReject.amount} ${txReject.currency} a été rejeté par l'administration.`,
                type: "ERROR"
              }
            })
          );
        }

        await prisma.$transaction(rejectOps);
        break;
      }

      // AJUSTEMENT MANUEL DE SOLDE
      case "UPDATE_BALANCE":
        if (!targetUserId || amount === undefined) return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
        await prisma.wallet.upsert({
          where: { userId_currency: { userId: targetUserId, currency: "PI" } },
          update: { balance: parseFloat(amount.toString()) },
          create: { userId: targetUserId, currency: "PI", balance: parseFloat(amount.toString()) },
        });
        break;

      // GESTION DU STATUT UTILISATEUR
      case "BAN":
        await prisma.user.update({ where: { id: targetUserId }, data: { status: UserStatus.BANNED } });
        break;

      case "UNBAN":
        await prisma.user.update({ where: { id: targetUserId }, data: { status: UserStatus.ACTIVE } });
        break;

      case "FREEZE":
        if (!targetUserId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        await prisma.$transaction([
          prisma.user.update({ where: { id: targetUserId }, data: { status: UserStatus.FROZEN } }),
          prisma.notification.create({
            data: {
              userId: targetUserId,
              title: "Compte Gele",
              message: "Votre compte a ete gele par l'administration. Contactez le support pour plus d'informations.",
              type: "WARNING"
            }
          })
        ]);
        break;

      case "UNFREEZE":
        if (!targetUserId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        await prisma.$transaction([
          prisma.user.update({ where: { id: targetUserId }, data: { status: UserStatus.ACTIVE } }),
          prisma.notification.create({
            data: {
              userId: targetUserId,
              title: "Compte Reactive",
              message: "Votre compte a ete reactive. Vous pouvez a nouveau utiliser tous les services PimPay.",
              type: "SUCCESS"
            }
          })
        ]);
        break;

      // ENVOI DE NOTIFICATION INDIVIDUELLE (Support)
      case "SEND_SUPPORT_NOTIFICATION":
        if (!targetUserId || !extraData) return NextResponse.json({ error: "ID utilisateur et message requis" }, { status: 400 });
        await prisma.notification.create({
          data: {
            userId: targetUserId,
            title: "Message du Support PimPay",
            message: extraData,
            type: "INFO"
          }
        });
        break;

      // CHANGEMENT DE ROLE (ADMIN/USER/MERCHANT/AGENT)
      case "TOGGLE_ROLE":
      case "SET_ROLE": {
        if (!targetUserId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        const validRoles = ["ADMIN", "USER", "MERCHANT", "AGENT"];
        if (extraData && validRoles.includes(extraData.toUpperCase())) {
          await prisma.user.update({
            where: { id: targetUserId },
            data: { role: extraData.toUpperCase() as UserRole }
          });
        } else {
          // Fallback: cycle through roles if no specific role given
          const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
          const roleOrder: UserRole[] = [UserRole.USER, UserRole.AGENT, UserRole.MERCHANT, UserRole.ADMIN];
          const currentIdx = roleOrder.indexOf(target?.role || UserRole.USER);
          const nextRole = roleOrder[(currentIdx + 1) % roleOrder.length];
          await prisma.user.update({
            where: { id: targetUserId },
            data: { role: nextRole }
          });
        }
        break;
      }

      // AUTO-APPROVE TOGGLE
      case "TOGGLE_AUTO_APPROVE":
        if (!targetUserId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        const userForAutoApprove = await prisma.user.findUnique({ where: { id: targetUserId }, select: { autoApprove: true } });
        await prisma.user.update({
          where: { id: targetUserId },
          data: { autoApprove: !userForAutoApprove?.autoApprove }
        });
        break;

      // ANNONCE RÉSEAU GLOBALE
      case "SEND_NETWORK_ANNOUNCEMENT":
        if (!extraData) return NextResponse.json({ error: "Message requis" }, { status: 400 });
        await prisma.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: { globalAnnouncement: extraData },
          create: { id: "GLOBAL_CONFIG", globalAnnouncement: extraData },
        });
        break;

      // AIRDROP INDIVIDUEL
      case "AIRDROP": {
        if (!targetUserId || amount === undefined) return NextResponse.json({ error: "ID utilisateur et montant requis" }, { status: 400 });
        const airdropAmount = parseFloat(amount.toString());
        if (isNaN(airdropAmount) || airdropAmount <= 0) {
          return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
        }
        await prisma.$transaction([
          prisma.wallet.upsert({
            where: { userId_currency: { userId: targetUserId, currency: "PI" } },
            update: { balance: { increment: airdropAmount } },
            create: { userId: targetUserId, currency: "PI", balance: airdropAmount },
          }),
          prisma.transaction.create({
            data: {
              fromUserId: requester.id,
              toUserId: targetUserId,
              amount: airdropAmount,
              currency: "PI",
              type: "AIRDROP",
              status: "SUCCESS",
              description: `Airdrop de ${airdropAmount} PI par l'admin`,
              reference: `AIRDROP-${Date.now()}`
            }
          }),
          prisma.notification.create({
            data: {
              userId: targetUserId,
              title: "Airdrop Recu",
              message: `Vous avez recu un airdrop de ${airdropAmount} PI de la part de PimPay.`,
              type: "SUCCESS"
            }
          })
        ]);
        break;
      }

      // AIRDROP GLOBAL (tous les utilisateurs)
      case "AIRDROP_ALL": {
        if (amount === undefined) return NextResponse.json({ error: "Montant requis" }, { status: 400 });
        const globalAmount = parseFloat(amount.toString());
        if (isNaN(globalAmount) || globalAmount <= 0) {
          return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
        }
        
        // Recuperer tous les utilisateurs actifs
        const allUsers = await prisma.user.findMany({
          where: { status: UserStatus.ACTIVE },
          select: { id: true }
        });
        
        if (allUsers.length === 0) {
          return NextResponse.json({ error: "Aucun utilisateur actif trouve" }, { status: 400 });
        }
        
        // Creer les operations pour chaque utilisateur
        const walletOps = allUsers.map(user => 
          prisma.wallet.upsert({
            where: { userId_currency: { userId: user.id, currency: "PI" } },
            update: { balance: { increment: globalAmount } },
            create: { userId: user.id, currency: "PI", balance: globalAmount },
          })
        );
        
        const notificationOps = allUsers.map(user =>
          prisma.notification.create({
            data: {
              userId: user.id,
              title: "Airdrop Global",
              message: `Vous avez recu un airdrop global de ${globalAmount} PI de la part de PimPay.`,
              type: "SUCCESS"
            }
          })
        );
        
        // Executer toutes les operations en transaction
        await prisma.$transaction([
          ...walletOps,
          ...notificationOps,
          prisma.transaction.create({
            data: {
              fromUserId: requester.id,
              amount: globalAmount * allUsers.length,
              currency: "PI",
              type: "AIRDROP",
              status: "SUCCESS",
              description: `Airdrop global de ${globalAmount} PI a ${allUsers.length} utilisateurs`,
              reference: `AIRDROP-GLOBAL-${Date.now()}`
            }
          })
        ]);
        
        return NextResponse.json({ 
          success: true, 
          message: `Airdrop de ${globalAmount} PI envoye a ${allUsers.length} utilisateurs` 
        });
      }

      // MAINTENANCE INDIVIDUELLE (Suspend l'utilisateur temporairement)
      case "USER_SPECIFIC_MAINTENANCE": {
        if (!targetUserId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        const userForMaint = await prisma.user.findUnique({ where: { id: targetUserId }, select: { status: true } });
        if (userForMaint?.status === "SUSPENDED") {
          // Re-activer l'utilisateur
          await prisma.$transaction([
            prisma.user.update({ where: { id: targetUserId }, data: { status: UserStatus.ACTIVE } }),
            prisma.notification.create({
              data: {
                userId: targetUserId,
                title: "Maintenance Terminee",
                message: "La maintenance de votre compte est terminee. Vous pouvez a nouveau utiliser tous les services PimPay.",
                type: "SUCCESS"
              }
            })
          ]);
        } else {
          // Mettre en maintenance (SUSPENDED)
          const maintMsg = extraData
            ? `Votre compte est en maintenance jusqu'au ${new Date(extraData).toLocaleString("fr-FR")}. Veuillez patienter.`
            : "Votre compte est temporairement en maintenance. Veuillez patienter.";
          await prisma.$transaction([
            prisma.user.update({ where: { id: targetUserId }, data: { status: UserStatus.SUSPENDED } }),
            prisma.notification.create({
              data: {
                userId: targetUserId,
                title: "Compte en Maintenance",
                message: maintMsg,
                type: "WARNING"
              }
            })
          ]);
        }
        break;
      }

      // RÉINITIALISATION SOLDE INDIVIDUEL (un seul utilisateur)
      case "RESET_USER_BALANCE": {
        if (!targetUserId) return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
        await prisma.wallet.updateMany({
          where: { userId: targetUserId },
          data: { balance: 0 },
        });
        await prisma.notification.create({
          data: {
            userId: targetUserId,
            title: "Solde Réinitialisé",
            message: "Votre solde a été réinitialisé à 0 par l'administration.",
            type: "WARNING"
          }
        });
        break;
      }

      // RÉINITIALISATION DE TOUS LES SOLDES (tous les utilisateurs)
      case "RESET_ALL_BALANCES": {
        const allWalletUsers = await prisma.user.findMany({
          select: { id: true }
        });

        if (allWalletUsers.length === 0) {
          return NextResponse.json({ error: "Aucun utilisateur trouvé" }, { status: 400 });
        }

        // Remettre tous les wallets à 0
        await prisma.wallet.updateMany({
          data: { balance: 0 }
        });

        // Notifier tous les utilisateurs
        const notifOps = allWalletUsers.map(u =>
          prisma.notification.create({
            data: {
              userId: u.id,
              title: "Solde Réinitialisé",
              message: "Votre solde a été réinitialisé à 0 par l'administration PimPay.",
              type: "WARNING"
            }
          })
        );
        await prisma.$transaction(notifOps);

        return NextResponse.json({
          success: true,
          message: `Soldes de ${allWalletUsers.length} utilisateurs réinitialisés à 0`
        });
      }

      default:
        return NextResponse.json({ error: `Action '${action}' non supportée` }, { status: 400 });
    }

    // 4. LOG D'AUDIT (Robuste contre les erreurs de FK)
    try {
      // On vérifie si targetId existe vraiment avant de lier le log
      const targetExists = targetUserId ? await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } }) : null;

      await prisma.auditLog.create({
        data: {
          adminId: requester.id,
          adminName: requester.name || requester.email || "Système",
          action: action,
          targetId: targetExists ? targetExists.id : null,
          details: `Action: ${action} | Target: ${targetUserId || 'Global'} | Data: ${extraData || amount || 'N/A'}`
        }
      });
    } catch (logErr) {
      console.warn("AuditLog non enregistré (erreur non-bloquante)");
    }

    return NextResponse.json({ success: true, message: "Action exécutée avec succès" });

  } catch (error: any) {
    console.error("ADMIN_CRITICAL_ERROR:", error);
    
    // Gestion spécifique des timeouts de Neon/Postgres
    if (error.code === 'P2024') {
      return NextResponse.json({ error: "La base de données met trop de temps à répondre (Réveil Neon)" }, { status: 503 });
    }

    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
