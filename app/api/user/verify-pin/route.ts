export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose"; // ✅ Remplacement de jsonwebtoken
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // 1. Récupération sécurisée du secret pour le build
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Erreur de configuration serveur" }, { status: 500 });
    }

    // 2. Lecture sécurisée du body
    const body = await req.json().catch(() => null);

    if (!body || typeof body.pin === 'undefined') {
      return NextResponse.json({ error: "Données manquantes : le champ 'pin' est requis." }, { status: 400 });
    }

    const pin = String(body.pin);

    // 3. Validation stricte du format
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "Le PIN doit contenir exactement 4 chiffres." }, { status: 400 });
    }

    // 4. Extraction et validation du Token avec JOSE (Asynchrone)
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let userId: string;

    try {
      const secretKey = new TextEncoder().encode(SECRET);
      const { payload } = await jwtVerify(token, secretKey);
      userId = (payload.userId || payload.id) as string;
    } catch (err) {
      return NextResponse.json({ error: "Session expirée ou invalide." }, { status: 401 });
    }

    // 5. Recherche de l'utilisateur
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

    // 6. Comparaison avec Bcrypt
    const isMatch = await bcrypt.compare(pin, user.pin);

    if (!isMatch) {
      console.warn(`[AUTH] Tentative de PIN incorrect pour l'utilisateur : ${userId}`);
      return NextResponse.json({ error: "Code PIN incorrect." }, { status: 400 });
    }

    // 7. Succès
    return NextResponse.json({
      success: true,
      message: "Accès autorisé"
    }, { status: 200 });

  } catch (error: any) {
    console.error("VERIFY_PIN_SERVER_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
