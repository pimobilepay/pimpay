import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ajuste le chemin selon ton projet
import bcrypt from "bcryptjs";
import * as jose from "jose";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
};

export async function POST(req: NextRequest) {
  try {
    // 1. Extraire le token du header Authorization
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Vérifier le token
    const secret = getJwtSecret();
    if (!secret) {
      return NextResponse.json({ error: "Erreur configuration serveur" }, { status: 500 });
    }

    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    // 3. Récupérer les données du corps de la requête
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    // 4. Trouver l'utilisateur dans la base PimPay
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 5. Vérifier si l'ancien mot de passe est correct
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "L'ancien mot de passe est incorrect" }, { status: 400 });
    }

    // 6. Hacher le nouveau mot de passe
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 7. Mettre à jour dans Prisma
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        // Optionnel : Enregistrer l'action dans les logs de sécurité
        securityLogs: {
          create: {
            action: "PASSWORD_CHANGE",
            ip: req.ip || "unknown",
          }
        }
      },
    });

    return NextResponse.json({ message: "Mot de passe mis à jour avec succès" }, { status: 200 });

  } catch (error) {
    console.error("Erreur API Change Password:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
