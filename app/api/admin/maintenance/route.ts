import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    // 1. Vérification de sécurité (Seul un ADMIN peut changer cela)
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { enabled } = await req.json();

    // 2. Création de la réponse
    const response = NextResponse.json({ 
      success: true, 
      maintenanceMode: enabled 
    });

    // 3. Définition du cookie de maintenance (durée 1 an ou jusqu'à désactivation)
    if (enabled) {
      response.cookies.set("maintenance_mode", "true", {
        path: "/",
        httpOnly: false, // Doit être lisible par le middleware
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    } else {
      response.cookies.delete("maintenance_mode");
    }

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
