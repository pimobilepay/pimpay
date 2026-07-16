export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/transaction/status?ref=<reference>
 *
 * Route de polling légère utilisée par les pages de confirmation
 * (ex: /deposit/confirm) pour savoir si une transaction est passée à
 * SUCCESS / FAILED / REJECTED pendant que l'utilisateur attend.
 *
 * Cette route n'existait pas — le frontend l'appelait déjà mais recevait
 * systématiquement un 404, donc la page /deposit/confirm ne détectait
 * jamais la confirmation via le polling (elle finissait par timeout après
 * 120s même quand le dépôt avait réussi).
 *
 * Sécurité : authentification obligatoire + vérification de propriété
 * (seuls les deux comptes impliqués dans la transaction peuvent consulter
 * son statut) — même logique que /api/transaction/[ref] et
 * /api/transaction/details/[id]. Réponse volontairement minimale (juste le
 * statut), pas de données de wallet ni d'infos personnelles.
 */
export async function GET(request: Request) {
  try {
    const session = (await auth()) as { id?: string; role?: string } | null;
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref");
    if (!ref) {
      return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { reference: ref },
      select: {
        reference: true,
        status: true,
        type: true,
        fromUserId: true,
        toUserId: true,
        createdAt: true,
      },
    });

    if (!transaction) {
      // 404 générique — on ne confirme pas si la référence existe pour un
      // autre utilisateur ou n'existe pas du tout (évite l'énumération).
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    const isOwner =
      transaction.fromUserId === session.id || transaction.toUserId === session.id;
    const isAdmin = session.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      reference: transaction.reference,
      status: transaction.status,
      type: transaction.type,
      createdAt: transaction.createdAt,
    });
  } catch (error) {
    console.error("TRANSACTION_STATUS_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
