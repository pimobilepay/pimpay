import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = cookies();
  
  // Supprimer le cookie en le mettant à une date passée
  cookieStore.set("pimpay_token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return NextResponse.json({ message: "Déconnecté avec succès" });
}
