import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

// PUT - Mettre a jour le statut d'un utilisateur (suspension, maintenance, etc.)
export async function PUT(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);

    if (!payload?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, status, reason, maintenanceUntil } = body;

    if (!userId || !status) {
      return NextResponse.json({ error: "userId et status requis" }, { status: 400 });
    }

    const validStatuses = ["ACTIVE", "SUSPENDED", "MAINTENANCE", "FROZEN", "BANNED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }


    const updateData: Record<string, unknown> = {
      status,
      statusReason: status === "ACTIVE" ? null : (reason || null),
      maintenanceUntil:
        status === "MAINTENANCE" && maintenanceUntil
          ? new Date(maintenanceUntil)
          : null,
    };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        status: true,
        statusReason: true,
        maintenanceUntil: true,
      },
    });

    console.log(`[Admin] User ${payload.id} changed status of user ${userId} to ${status}`);

    return NextResponse.json({
      success: true,
      message: `Statut de l'utilisateur mis a jour: ${status}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Erreur mise a jour statut utilisateur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET - Obtenir le statut d'un utilisateur
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);

    if (!payload?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const isAdmin = payload.role === "ADMIN";
    const isOwnAccount = payload.id === userId;

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
        maintenanceUntil: true,
      },
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
