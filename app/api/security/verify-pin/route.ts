export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs"; // Assure-toi d'utiliser la même lib que pour l'inscription

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    
    // Récupérer le Token dans les headers pour identifier l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Ici, j'extrais l'ID de l'utilisateur (à adapter selon ton middleware d'auth)
    // Pour cet exemple, je suppose que tu as accès à l'user via ton système d'auth
    // Si tu utilises une lib comme NextAuth, récupère la session ici.
    
    const user = await prisma.user.findFirst({
      where: { 
        // Identifiant de l'utilisateur connecté
        // Ex: id: session.user.id
      }
    });

    if (!user || !user.pin) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // COMPARAISON DU PIN
    const isMatch = await bcrypt.compare(pin, user.pin);

    console.log("PIN saisi:", pin);
    console.log("PIN en DB:", user.pin);
    console.log("Résultat:", isMatch ? "Correct" : "PIN Incorrect");

    if (isMatch) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      // --- CRITIQUE : Renvoyer 400 ou 403, JAMAIS 401 pour un mauvais PIN ---
      return NextResponse.json({ error: "Ancien code PIN incorrect" }, { status: 400 });
    }

  } catch (error) {
    console.error("Erreur API Verify PIN:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
