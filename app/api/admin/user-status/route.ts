import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// PUT - Mettre a jour le statut d'un utilisateur (suspension, maintenance, etc.)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Verifier que l'utilisateur est admin
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (admin?.role !== "ADMIN" && admin?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, status, reason, maintenanceUntil } = body;

    if (!userId || !status) {
      return NextResponse.json({ error: "userId et status requis" }, { status: 400 });
    }

    // Valider le statut
    const validStatuses = ["ACTIVE", "SUSPENDED", "MAINTENANCE", "FROZEN", "BANNED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    // Verifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Empecher la modification des super admins
    if (targetUser.role === "SUPER_ADMIN" && admin?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Impossible de modifier un super admin" }, { status: 403 });
    }

    // Preparer les donnees de mise a jour
    const updateData: any = {
      status,
      statusReason: status === "ACTIVE" ? null : (reason || null),
      maintenanceUntil: status === "MAINTENANCE" && maintenanceUntil 
        ? new Date(maintenanceUntil) 
        : null
    };

    // Mettre a jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        status: true,
        statusReason: true,
        maintenanceUntil: true
      }
    });

    // Logger l'action
    console.log(`[Admin] User ${session.user.id} changed status of user ${userId} to ${status}`);

    return NextResponse.json({
      success: true,
      message: `Statut de l'utilisateur mis a jour: ${status}`,
      user: updatedUser
    });

  } catch (error) {
    console.error("Erreur mise a jour statut utilisateur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET - Obtenir le statut d'un utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    // Verifier que l'utilisateur est admin ou demande son propre statut
    const requestingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    const isAdmin = requestingUser?.role === "ADMIN" || requestingUser?.role === "SUPER_ADMIN";
    const isOwnAccount = session.user.id === userId;

    if (!isAdmin && !isOwnAccount) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        status: true,
        statusReason: true,
        maintenanceUntil: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    return NextResponse.json({ user });

  } catch (error) {
    console.error("Erreur recuperation statut utilisateur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
