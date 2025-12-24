import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose"; // On utilise jose comme dans les autres fichiers
import bcrypt from "bcryptjs";

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
    
    // Sécurité contre les tokens vides ou "undefined"
    if (!token || token === "undefined") {
      return NextResponse.json({ error: "Token corrompu" }, { status: 401 });
    }

    // 3. Vérification du Token avec JOSE (Cohérence avec le reste du projet)
    let userId: string;
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
      const { payload } = await jwtVerify(token, secret);
      userId = (payload.userId || payload.sub || payload.id) as string;
    } catch (tokenErr: any) {
      console.error("JWT_VERIFY_PIN_ERROR:", tokenErr.message);
      return NextResponse.json({ error: "Session expirée ou invalide" }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Identifiant introuvable" }, { status: 401 });
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

    // 7. Succès
    return NextResponse.json({
      success: true,
      message: "Vérification réussie"
    }, { status: 200 });

  } catch (err: any) {
    console.error("VERIFY PIN ERROR:", err.message);
    return NextResponse.json({ error: "Erreur technique lors de la vérification" }, { status: 500 });
  }
}
