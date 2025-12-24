import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    // 1. Lecture sécurisée du body
    const body = await req.json().catch(() => null);
    
    if (!body || typeof body.pin === 'undefined') {
      return NextResponse.json({ error: "Données manquantes : le champ 'pin' est requis." }, { status: 400 });
    }

    const pin = String(body.pin); // On s'assure que c'est une chaîne de caractères

    // 2. Validation stricte du format
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "Le PIN doit contenir exactement 4 chiffres." }, { status: 400 });
    }

    // 3. Extraction et validation du Token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let userId: string;

    try {
      const payload: any = jwt.verify(token, JWT_SECRET);
      userId = payload.userId || payload.id;
    } catch (err) {
      return NextResponse.json({ error: "Session expirée ou invalide." }, { status: 401 });
    }

    // 4. Recherche de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pin: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 });
    }

    if (!user.pin) {
      return NextResponse.json({ 
        error: "Aucun code PIN configuré.", 
        setupRequired: true 
      }, { status: 403 });
    }

    // 5. Comparaison avec Bcrypt
    // IMPORTANT : Si user.pin en base n'est pas un hash bcrypt (commençant par $2a$), 
    // cette fonction renverra toujours 'false', causant l'erreur 400.
    const isMatch = await bcrypt.compare(pin, user.pin);

    if (!isMatch) {
      console.warn(`[AUTH] Tentative de PIN incorrect pour l'utilisateur : ${userId}`);
      return NextResponse.json({ error: "Code PIN incorrect." }, { status: 400 });
    }

    // 6. Succès
    return NextResponse.json({ 
      success: true, 
      message: "Accès autorisé" 
    }, { status: 200 });

  } catch (error: any) {
    console.error("VERIFY_PIN_SERVER_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
