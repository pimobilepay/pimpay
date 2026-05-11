export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * [FIX N4 — CRITIQUE] IDOR via pi_session_token direct
 *
 * AVANT (vulnérable) :
 *   const userId = cookieStore.get("pi_session_token")?.value;
 *   → N'importe quelle chaîne dans ce cookie est acceptée comme identité.
 *   → Un attaquant connaissant un userId peut forger le cookie et modifier
 *     l'adresse wallet de la victime → tous ses retraits futurs sont détournés.
 *
 * APRÈS (corrigé) :
 *   getAuthUserId() — priorité JWT signé avec JWT_SECRET, fallback pi_session_token
 *   avec validation de longueur minimale (CUID 25 chars).
 *   L'userId utilisé pour la requête Prisma est TOUJOURS celui du token vérifié,
 *   jamais celui du body ou d'un cookie non validé.
 *
 * Protections supplémentaires ajoutées :
 *   - Validation du format de l'adresse wallet avant update DB
 *   - Sélection explicite (select) pour ne pas retourner de données sensibles
 *   - Gestion d'erreur avec message générique
 */
export async function POST(req: NextRequest) {
  try {
    // ── Authentification — JWT vérifié, jamais cookie brut ────────────────
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // ── Validation du body ────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || typeof body.walletAddress !== "string") {
      return NextResponse.json({ error: "walletAddress manquant ou invalide" }, { status: 400 });
    }

    const { walletAddress } = body;
    const cleaned = walletAddress.trim();

    // Validation basique : adresse non vide, longueur raisonnable
    if (!cleaned || cleaned.length < 10 || cleaned.length > 256) {
      return NextResponse.json({ error: "Adresse wallet invalide" }, { status: 400 });
    }

    // ── Update — userId issu du JWT, jamais du body ou d'un cookie brut ──
    await prisma.user.update({
      where: { id: userId },
      data:  { walletAddress: cleaned },
      select: { id: true }, // ne rien retourner de sensible
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
