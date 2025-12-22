// app/api/clear-cache/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Ici tu peux ajouter du nettoyage serveur si nécessaire
    // ex: supprimer des sessions Prisma ou des caches côté serveur

    return NextResponse.json({ message: "Cache serveur vidé avec succès" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur lors de la suppression du cache" }, { status: 500 });
  }
}
