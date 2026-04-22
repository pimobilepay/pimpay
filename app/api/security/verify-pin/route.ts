export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();

    if (!pin) {
      return NextResponse.json({ error: "Code PIN requis" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    
    let userId: string | null = null;

    // 1. Pi Network session (pi_session_token contient directement le userId)
    if (piToken && piToken.length > 20) {
      userId = piToken;
    } 
    // 2. Token JWT classique via verifyJWT
    else if (classicToken) {
      const payload = await verifyJWT(classicToken);
      if (!payload) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
      userId = payload.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pin: true },
    });

    if (!user || !user.pin) {
      return NextResponse.json({ error: "Utilisateur non trouvé ou PIN non configuré" }, { status: 404 });
    }

    // Comparaison sécurisée du PIN
    const isMatch = await bcrypt.compare(pin, user.pin);

    if (isMatch) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Ancien code PIN incorrect" }, { status: 400 });
    }

  } catch (error) {
    console.error("Erreur API Verify PIN:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
