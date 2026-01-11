export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = cookies();

    // On prépare les options communes pour la suppression
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const, // "lax" est préférable pour la redirection de déconnexion
      expires: new Date(0),
      path: "/",
    };

    // 1. Supprimer le cookie "token"
    cookieStore.set("token", "", cookieOptions);

    // 2. Supprimer "pimpay_token"
    cookieStore.set("pimpay_token", "", cookieOptions);

    // 3. Supprimer tout autre cookie de session potentiel (ex: "session")
    cookieStore.set("session", "", cookieOptions);

    return NextResponse.json({
      success: true,
      message: "Déconnecté avec succès",
      redirectTo: "auth/login" // On envoie l'URL de redirection dans la réponse
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion" },
      { status: 500 }
    );
  }
}
