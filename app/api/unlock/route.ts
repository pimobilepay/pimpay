export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * [FIX V10] — admin_bypass : mécanisme conservé mais sécurisé.
 * - Audit log systématique (IP + timestamp) à chaque utilisation
 * - Cookie maxAge réduit à 2h (au lieu de 24h)
 * - Le secret ne doit jamais être brute-forcé : ADMIN_BYPASS_TOKEN >= 32 caractères
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret } = body;

    if (!secret || secret !== process.env.ADMIN_BYPASS_TOKEN) {
      // Audit log des tentatives échouées
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
      console.warn(`[ADMIN_BYPASS] Tentative échouée depuis IP: ${ip} à ${new Date().toISOString()}`);
      return new NextResponse("Accès refusé", { status: 403 });
    }

    // [FIX V10] — Audit log obligatoire à chaque utilisation réussie
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    console.warn(
      `[ADMIN_BYPASS] ⚠️  UTILISATION DU BYPASS ADMIN depuis IP: ${ip} à ${new Date().toISOString()} — Vérifier si autorisé`
    );

    const cookieStore = await cookies();
    cookieStore.set("admin_bypass", "true", {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 2, // [FIX V10] 2h au lieu de 24h
      path: "/",
      sameSite: "strict",
    });

    return NextResponse.json({ success: true });
  } catch {
    return new NextResponse("Accès refusé", { status: 403 });
  }
}

// GET supprimé — secret ne doit jamais transiter en query parameter
export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
