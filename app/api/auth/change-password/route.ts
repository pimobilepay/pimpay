import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function PUT(req: NextRequest) {
  try {
    /* 1️⃣ Vérifier le token */
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
    }

    const userId = payload.id;
    if (!userId) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 401 });

    /* 2️⃣ Lire le body */
    const { oldPassword, newPassword } = await req.json();
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    /* 3️⃣ Charger l'utilisateur */
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    /* 4️⃣ Vérifier ancien mot de passe */
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Ancien mot de passe incorrect" }, { status: 400 });
    }

    /* 5️⃣ Hasher & mettre à jour */
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    /* 6️⃣ (Optionnel) Générer un nouveau token si besoin */
    const newToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "7d" });

    return NextResponse.json({
      message: "Mot de passe mis à jour avec succès",
      token: newToken, // <-- frontend peut mettre à jour localStorage
    });

  } catch (error) {
    console.error("UPDATE PASSWORD ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
