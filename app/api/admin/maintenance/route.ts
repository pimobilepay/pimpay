export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    // 1. Vérification de sécurité stricte
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. Récupération des données (Maintenance, Frais, ou Annonce)
    const body = await req.json();
    const { enabled, fee, announcement, action } = body;

    // 3. Préparation de la réponse de base
    const response = NextResponse.json({
      success: true,
      maintenanceMode: enabled ?? null,
      updatedFee: fee ?? null,
      updatedAnnouncement: announcement ?? null
    });

    // --- LOGIQUE DE MAINTENANCE (Ta version originale préservée) ---
    if (enabled !== undefined) {
      if (enabled) {
        response.cookies.set("maintenance_mode", "true", {
          path: "/",
          httpOnly: false, // Lisible par le middleware
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365, // 1 an
        });
      } else {
        response.cookies.delete("maintenance_mode");
      }
    }

    // --- NOUVELLE LOGIQUE : FRAIS & ANNONCES ---
    // Ici, tu devrais normalement sauvegarder dans ta Base de Données.
    // En attendant, nous confirmons la réception pour éviter l'erreur 400.
    if (fee !== undefined) {
      console.log(`[CONFIG] Nouveaux frais réseau : π ${fee}`);
      // db.config.update({ where: { key: 'FEE' }, data: { value: fee } })
    }

    if (announcement !== undefined) {
      console.log(`[CONFIG] Nouvelle annonce : ${announcement}`);
      // db.config.update({ where: { key: 'ANNOUNCEMENT' }, data: { value: announcement } })
    }

    // --- LOGIQUE DE BACKUP ---
    if (action === "BACKUP_DB") {
      console.log("[SYSTEM] Backup de la base de données initié par l'admin");
      // Logique de dump SQL ou export JSON ici
    }

    return response;

  } catch (error) {
    console.error("ADMIN_CONFIG_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Optionnel : Ajoute un GET pour que le dashboard lise les vraies valeurs au chargement
export async function GET() {
  try {
    // Simuler la lecture depuis la DB ou les cookies
    return NextResponse.json({
      maintenanceMode: false, // À lire depuis la DB
      transactionFee: 0.01,
      globalAnnouncement: "Système opérationnel"
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
