import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = cookies();

    // 1. Supprimer le cookie "token" (nom utilisé dans ton login actuel)
    cookieStore.set("token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      expires: new Date(0), // Expire immédiatement
      path: "/",
    });

    // 2. Par sécurité, supprimer aussi l'ancien nom si présent
    cookieStore.set("pimpay_token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      expires: new Date(0),
      path: "/",
    });

    return NextResponse.json({ 
      success: true, 
      message: "Déconnecté avec succès" 
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion" }, 
      { status: 500 }
    );
  }
}
