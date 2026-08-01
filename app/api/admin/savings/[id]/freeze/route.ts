/**
 * POST /api/admin/savings/[id]/freeze — Gèle ou dégèle un compte épargne.
 *
 * Seul levier de mutation confié à l'admin sur l'épargne d'un client : il peut
 * suspendre les mouvements (dépôt, retrait, clôture) sans jamais déplacer de
 * fonds. `assertSavingsWithdrawable` et les routes utilisateur refusent déjà
 * tout mouvement sur un compte FROZEN.
 *
 * Le gel n'existe que pour les comptes épargne : l'enum `VaultStatus` n'a pas
 * d'état FROZEN, un coffre est protégé par son verrou temporel.
 *
 * Corps : { frozen: boolean, reason?: string }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission(req, PERMISSIONS.SAVINGS_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (typeof body.frozen !== "boolean") {
    return NextResponse.json(
      { error: "Le champ « frozen » (booléen) est requis." },
      { status: 400 }
    );
  }
  const frozen = body.frozen;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 200) : "";

  // Un gel bloque l'accès du client à son argent : on exige un motif tracé.
  if (frozen && !reason) {
    return NextResponse.json(
      { error: "Un motif est obligatoire pour geler un compte épargne." },
      { status: 400 }
    );
  }

  const account = await prisma.savingsAccount.findUnique({
    where: { id },
    select: { id: true, status: true, name: true, accountNumber: true, userId: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Compte épargne introuvable." }, { status: 404 });
  }
  if (account.status === "CLOSED") {
    return NextResponse.json(
      { error: "Ce compte est clôturé, son statut ne peut plus changer." },
      { status: 400 }
    );
  }

  const target = frozen ? "FROZEN" : "ACTIVE";
  if (account.status === target) {
    return NextResponse.json(
      { error: frozen ? "Ce compte est déjà gelé." : "Ce compte est déjà actif." },
      { status: 400 }
    );
  }

  const updated = await prisma.savingsAccount.update({
    where: { id: account.id },
    data: { status: target },
    select: { id: true, status: true },
  });

  await logAdminAction(req, ctx.payload, {
    action: frozen ? "SAVINGS_FREEZE" : "SAVINGS_UNFREEZE",
    category: "finance",
    targetId: account.id,
    targetType: "savingsAccount",
    details: `${frozen ? "Gel" : "Dégel"} du compte ${account.accountNumber} (porteur ${account.userId})${
      reason ? ` — motif : ${reason}` : ""
    }`,
  });

  return NextResponse.json({ ok: true, id: updated.id, status: updated.status });
}
