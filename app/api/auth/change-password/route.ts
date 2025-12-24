import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const payload = verifyAuth(req) as any;
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const body = await req.json();
    
    // Nettoyage strict des entrées
    const oldPassword = body.oldPassword?.toString().trim();
    const newPassword = body.newPassword?.toString().trim();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // --- DEBUG ZONE ---
    console.log("--- DEBUG CHANGE PASSWORD ---");
    console.log("Email:", user.email);
    console.log("Mot de passe en DB (hash):", user.password.substring(0, 10) + "...");
    console.log("Longueur mot de passe saisi:", oldPassword.length);
    
    // Test de comparaison
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    console.log("Résultat Bcrypt Match:", isMatch);
    // ------------------

    if (!isMatch) {
      return NextResponse.json({ 
        error: "L'ancien mot de passe est incorrect",
        details: "Vérifiez les majuscules ou espaces accidentels" 
      }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log("✅ Mot de passe mis à jour avec succès");
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("CRITICAL ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
