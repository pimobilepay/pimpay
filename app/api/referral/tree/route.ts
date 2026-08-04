export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildReferralTopology } from "@/lib/referral-tree";

/**
 * GET /api/referral/tree
 * Arbre de topologie des affilies de l'utilisateur connecte.
 * Query: ?depth=1..5 (defaut 3)
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await auth();
    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const requested = Number(req.nextUrl.searchParams.get("depth"));
    const depth = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 5) : 3;

    const topology = await buildReferralTopology(currentUser.id, {
      maxDepth: depth,
      maxNodes: 300,
      // L'utilisateur ne voit que son parrain direct, pas toute la chaine amont.
      uplineDepth: 1,
    });

    if (!topology) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    return NextResponse.json({ success: true, depth, topology });
  } catch (error: any) {
    console.error("REFERRAL_TREE_ERROR:", error?.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
