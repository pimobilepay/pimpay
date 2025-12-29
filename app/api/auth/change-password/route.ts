import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth"; // Ta fonction asynchrone
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    // AJOUT DU 'await' ICI - C'est crucial !
    const payload = await verifyAuth(req);
    
    if (!payload || !payload.id) {
      console.error("[PimPay Auth] Token invalide ou manquant");
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const body = await req.json();
    const oldPassword = body.oldPassword?.toString().trim();
    const newPassword = body.newPassword?.toString().trim();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // Recherche de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Comparaison Bcrypt
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    
    if (!isMatch) {
      return NextResponse.json({ 
        error: "L'ancien mot de passe est incorrect" 
      }, { status: 400 }); 
    }

    // Hachage et Mise à jour
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ 
      success: true,
      message: "Mot de passe modifié" 
    }, { status: 200 });

  } catch (error: any) {
    console.error("ERREUR API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
