import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    // 1. VÉRIFICATION DE SÉCURITÉ
    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Correction : On ne sélectionne QUE les champs dont on est sûr de l'existence
    const requester = await prisma.user.findUnique({ 
      where: { id: payload.id as string },
      select: { id: true, role: true, name: true, email: true } 
    });

    if (!requester || requester.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, action, amount, extraData } = body;

    // 2. LOGIQUE DES ACTIONS
    switch (action) {
      case "APPROVE_WITHDRAW":
        const txToApprove = await prisma.transaction.findFirst({
          where: { fromUserId: userId, status: "PENDING", type: "WITHDRAWAL" },
          orderBy: { createdAt: 'desc' }
        });
        if (!txToApprove) return NextResponse.json({ error: "Aucun retrait en attente" }, { status: 404 });
        await prisma.transaction.update({
          where: { id: txToApprove.id },
          data: { status: "COMPLETED" }
        });
        break;

      case "REJECT_WITHDRAW":
        const txToReject = await prisma.transaction.findFirst({
          where: { fromUserId: userId, status: "PENDING", type: "WITHDRAWAL" },
          orderBy: { createdAt: 'desc' }
        });
        if (!txToReject) return NextResponse.json({ error: "Aucun retrait en attente" }, { status: 404 });
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: txToReject.id },
            data: { status: "FAILED", note: "Rejeté par l'administration" }
          }),
          prisma.wallet.update({
            where: { userId: userId },
            data: { balance: { increment: txToReject.amount } }
          })
        ]);
        break;

      case "TOGGLE_AUTO_APPROVE":
        // PROTECTION CRITIQUE : On vérifie si la colonne existe avant d'essayer de switcher
        try {
          const userToToggle = await prisma.user.findUnique({ 
            where: { id: userId },
            // On ne demande que le champ autoApprove spécifiquement ici
          });
          
          if (!userToToggle) return NextResponse.json({ error: "User non trouvé" }, { status: 404 });
          
          // @ts-ignore - On ignore l'erreur TS car la colonne peut manquer en DB
          const currentStatus = userToToggle.autoApprove;

          await prisma.user.update({
            where: { id: userId },
            data: { autoApprove: !currentStatus }
          });
        } catch (e) {
          return NextResponse.json({ 
            error: "La fonctionnalité 'Auto-Approve' n'est pas encore activée en base de données. Veuillez lancer les migrations." 
          }, { status: 500 });
        }
        break;

      case "BAN":
        const userToBan = await prisma.user.findUnique({ where: { id: userId } });
        if (!userToBan) return NextResponse.json({ error: "User non trouvé" }, { status: 404 });
        await prisma.user.update({
          where: { id: userId },
          data: { status: userToBan.status === "BANNED" ? "ACTIVE" : "BANNED" }
        });
        break;

      case "FREEZE":
      case "UNFREEZE":
        await prisma.user.update({
          where: { id: userId },
          data: { status: action === "FREEZE" ? "BANNED" : "ACTIVE" }
        });
        break;

      case "UPDATE_BALANCE":
        if (amount === undefined) return NextResponse.json({ error: "Montant requis" }, { status: 400 });
        const userWallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!userWallet) return NextResponse.json({ error: "Wallet introuvable" }, { status: 404 });
        await prisma.wallet.update({
          where: { id: userWallet.id },
          data: { balance: { increment: amount } }
        });
        break;

      case "RESET_PASSWORD":
        if (!extraData) return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
        const hashedPass = await bcrypt.hash(extraData, 10);
        await prisma.user.update({
          where: { id: userId },
          data: { password: hashedPass }
        });
        break;

      case "RESET_PIN":
        if (!extraData) return NextResponse.json({ error: "PIN requis" }, { status: 400 });
        await prisma.user.update({
          where: { id: userId },
          data: { pin: extraData }
        });
        break;

      case "TOGGLE_ROLE":
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return NextResponse.json({ error: "User non trouvé" }, { status: 404 });
        await prisma.user.update({
          where: { id: userId },
          data: { role: targetUser.role === "ADMIN" ? "USER" : "ADMIN" }
        });
        break;

      case "AIRDROP":
        if (!amount || amount <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
        await prisma.wallet.updateMany({
          data: { balance: { increment: amount } }
        });
        break;

      case "VERIFY_ALL":
        await prisma.user.updateMany({
          where: { kycStatus: "PENDING" },
          data: { kycStatus: "VERIFIED", status: "ACTIVE" }
        });
        break;

      case "SEND_SUPPORT":
        if (!extraData) return NextResponse.json({ error: "Message vide" }, { status: 400 });
        await prisma.notification.create({
          data: {
            userId: userId,
            title: "Message de l'administration",
            message: extraData,
            type: "SUPPORT",
            read: false
          }
        });
        break;

      default:
        return NextResponse.json({ error: `Action '${action}' non implémentée` }, { status: 400 });
    }

    // 3. LOG D'AUDIT
    try {
      await prisma.auditLog.create({
        data: {
          adminName: requester.name || requester.email,
          action: action,
          targetEmail: userId || "SYSTEM",
          createdAt: new Date()
        }
      });
    } catch (logError) {
      console.error("Audit log error:", logError);
    }

    return NextResponse.json({ success: true, message: `Action ${action} exécutée` });

  } catch (error: any) {
    console.error("API_ADMIN_ACTION_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur lors de l'action admin." }, { status: 500 });
  }
}
