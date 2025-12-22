import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function PUT(req: NextRequest) {
  try {
    console.log("🔹 Requête update-password reçue");

    // 1️⃣ Vérifier le token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ Token manquant ou mal formaté");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
      console.log("✅ Token valide:", payload);
    } catch (err) {
      console.log("❌ Token invalide:", err);
      return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
    }

    const userId = payload.id;
    if (!userId) {
      console.log("❌ userId non trouvé dans le token");
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 401 });
    }

    // 2️⃣ Lire le body
    const body = await req.json();
    const { oldPassword, newPassword } = body;
    console.log("🔹 Body reçu:", body);

    if (!oldPassword || !newPassword) {
      console.log("❌ Champs manquants");
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // 3️⃣ Charger l'utilisateur
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      console.log("❌ Utilisateur introuvable ou sans mot de passe");
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    console.log("🔹 Utilisateur trouvé:", { id: user.id, email: user.email });

    // 4️⃣ Vérifier ancien mot de passe
    const isValid = await bcrypt.compare(oldPassword, user.password);
    console.log("🔹 Résultat bcrypt:", isValid);

    if (!isValid) {
      return NextResponse.json({ error: "Ancien mot de passe incorrect" }, { status: 400 });
    }

    // 5️⃣ Hasher & mettre à jour
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    // 6️⃣ Générer un nouveau token (optionnel)
    const newToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "7d" });

    console.log("✅ Mot de passe mis à jour");

    return NextResponse.json({
      message: "Mot de passe mis à jour avec succès",
      token: newToken,
    });

  } catch (error) {
    console.error("🔴 ERREUR UPDATE PASSWORD:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
