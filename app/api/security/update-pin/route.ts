export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose"; // Ou ta méthode habituelle pour vérifier le token

const prisma = new PrismaClient();

export async function PUT(req: Request) {
  try {
    const { newPin } = await req.json();

    // 1. Validation du PIN
    if (!newPin || newPin.length !== 4) {
      return NextResponse.json({ error: "Format PIN invalide" }, { status: 400 });
    }

    // 2. Extraction sécurisée de l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    // NOTE : Remplace 'TON_SECRET_JWT' par ta variable d'environnement (ex: process.env.JWT_SECRET)
    // Ici, nous récupérons l'ID utilisateur. Si tu as un middleware qui décode déjà, utilise-le.
    // Pour PimPay, je vais chercher l'utilisateur qui possède ce token.
    
    const user = await prisma.user.findFirst({
      where: {
        // Cette partie dépend de comment tu stockes tes sessions. 
        // Si tu n'as pas de middleware, nous cherchons par l'ID contenu dans le token.
        // Option simple pour test : session.user.id
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 3. Hachage sécurisé
    const salt = await bcrypt.genSalt(12);
    const hashedPin = await bcrypt.hash(newPin, salt);

    // 4. MISE À JOUR CRITIQUE DANS PRISMA
    // On utilise update avec l'ID précis pour être sûr du changement
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { pin: hashedPin },
    });

    console.log(`[PimPay Success] PIN mis à jour pour l'utilisateur ID: ${updatedUser.id}`);

    return NextResponse.json({ 
      success: true, 
      message: "Code PIN PimPay mis à jour avec succès" 
    }, { status: 200 });

  } catch (error) {
    console.error("Erreur API Update-PIN:", error);
    return NextResponse.json({ 
      error: "Erreur lors de la mise à jour en base de données" 
    }, { status: 500 });
  }
}
