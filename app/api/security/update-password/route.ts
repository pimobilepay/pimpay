import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    console.log("🔹 Requête update-password reçue");

    // 1. Extraction et vérification du Token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = (payload.userId || payload.id || payload.sub) as string;

    // 2. Récupération des données
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 8 caractères" }, { status: 400 });
    }

    // 3. Recherche de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true }
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Utilisateur non trouvé ou mot de passe non défini" }, { status: 404 });
    }

    // 4. Vérification du mot de passe actuel
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    console.log(`🔹 Comparaison mot de passe: ${isMatch ? "✅ MATCH" : "❌ NO MATCH"}`);

    if (!isMatch) {
      return NextResponse.json({ error: "L'ancien mot de passe est incorrect" }, { status: 400 });
    }

    // 5. Hachage du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 6. Mise à jour dans la base de données
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    console.log("✅ Mot de passe mis à jour avec succès");

    return NextResponse.json({ 
      success: true, 
      message: "Mot de passe modifié avec succès" 
    });

  } catch (error: any) {
    console.error("❌ ERREUR_UPDATE_PASSWORD:", error.message);
    return NextResponse.json({ error: "Erreur lors de la modification" }, { status: 500 });
  }
}
