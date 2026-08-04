export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { buildReferralTopology } from "@/lib/referral-tree";

/**
 * GET /api/admin/users/:id/referral-tree
 * Topologie complete (parrains en amont + filleuls en aval) d'un utilisateur.
 * Query: ?depth=1..6 (defaut 4)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePermission(req, PERMISSIONS.USERS_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const requested = Number(req.nextUrl.searchParams.get("depth"));
    const depth = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 6) : 4;

    const topology = await buildReferralTopology(id, {
      maxDepth: depth,
      maxNodes: 500,
      uplineDepth: 5,
    });

    if (!topology) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    return NextResponse.json({ success: true, depth, topology });
  } catch (error: any) {
    console.error("ADMIN_REFERRAL_TREE_ERROR:", error?.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
