import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ajustez l'import selon votre structure
import { getServerSession } from "next-auth"; // Ou votre méthode de session

export async function GET() {
  try {
    // 1. Récupérer l'utilisateur (Exemple avec une logique de session)
    // Remplacez par votre logique de récupération d'ID utilisateur
    const userId = "id_de_l_utilisateur"; 

    const sessions = await prisma.session.findMany({
      where: { userId: userId },
      orderBy: { lastActiveAt: "desc" },
    });

    const devices = sessions.map((s) => {
      // Analyse basique du User Agent pour ne pas faire échouer le build
      const ua = s.userAgent || "";
      
      return {
        id: s.id,
        name: s.deviceName || "Appareil inconnu",
        // Correction : On extrait l'OS du User Agent au lieu de chercher une colonne inexistante
        os: ua.includes("Windows") ? "Windows" : ua.includes("Android") ? "Android" : ua.includes("iPhone") ? "iOS" : "OS inconnu",
        // Correction : Pareil pour le navigateur
        browser: ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : "Navigateur",
        ip: s.ip || "0.0.0.0",
        // Correction : On met une valeur par défaut car 'location' n'est pas dans le schéma
        location: "Localisation indisponible",
        lastActive: s.lastActiveAt,
        current: false, // À comparer avec le token actuel si nécessaire
      };
    });

    return NextResponse.json(devices);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
