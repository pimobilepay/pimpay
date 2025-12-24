export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

async function getUserIdFromToken(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    // 1. Tentative via Cookie
    let token = cookieStore.get("pimpay_token")?.value;

    // 2. Tentative via Header (si le cookie échoue)
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      console.error("DEBUG_AUTH: Aucun token trouvé (Cookie ou Header)");
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch (error: any) {
    console.error("DEBUG_AUTH: Échec de vérification JWT ->", error.message);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromToken(req);

  if (!userId) {
    return NextResponse.json(
      { error: "Session invalide ou expirée" }, 
      { status: 401 }
    );
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("DEBUG_DB: Erreur Prisma GET ->", error);
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, all } = body;

    if (all) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true }
      });
      return NextResponse.json({ success: true });
    }

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const updated = await prisma.notification.update({
      where: { id, userId },
      data: { read: true }
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    console.error("DEBUG_DB: Erreur Prisma POST ->", error);
    return NextResponse.json({ error: "Mise à jour échouée" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    await prisma.notification.delete({
      where: { id, userId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DEBUG_DB: Erreur Prisma DELETE ->", error);
    return NextResponse.json({ error: "Suppression échouée" }, { status: 500 });
  }
}
