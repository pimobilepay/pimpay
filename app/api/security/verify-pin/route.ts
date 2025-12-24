import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET n'est pas défini");

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();

    // 1. Validation du format
    if (!pin || pin.length !== 4) {
      return NextResponse.json({ error: "Le code PIN doit comporter 4 chiffres" }, { status: 400 });
    }

    // 2. Extraction du Token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Session invalide ou absente" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // 3. Vérification du Token et récupération de l'ID
    let userId: string;
    try {
      const payload: any = jwt.verify(token, JWT_SECRET);
      // On vérifie les deux formats possibles selon ton implémentation
      userId = payload.userId || payload.id; 
    } catch (tokenErr) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Identifiant utilisateur introuvable dans le token" }, { status: 401 });
    }

    // 4. Recherche de l'utilisateur dans la DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pin: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // 5. Cas où l'utilisateur n'a pas encore de PIN défini
    if (!user.pin) {
      return NextResponse.json({ 
        error: "Aucun code PIN n'est configuré sur ce compte",
        setupRequired: true 
      }, { status: 403 });
    }

    // 6. Comparaison sécurisée avec Bcrypt
    const isMatch = await bcrypt.compare(pin, user.pin);
    
    if (!isMatch) {
      return NextResponse.json({ error: "Code PIN incorrect" }, { status: 400 });
    }

    // 7. Succès : On peut renvoyer un "success token" ou simplement un message
    return NextResponse.json({ 
      success: true,
      message: "Vérification réussie" 
    }, { status: 200 });

  } catch (err) {
    console.error("VERIFY PIN ERROR:", err);
    return NextResponse.json({ error: "Erreur technique lors de la vérification" }, { status: 500 });
  }
}
