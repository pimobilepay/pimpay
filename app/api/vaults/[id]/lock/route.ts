/**
 * POST /api/vaults/[id]/lock — Dépose des fonds dans le coffre et le verrouille.
 *
 * Mouvement entrant : pas de PIN. Le coffre passe en LOCKED tant que
 * `lockUntil` est dans le futur ; il reste ACTIVE si le verrou est déjà échu.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  postSavingsMovement,
  isVaultLocked,
  parseAmount,
  buildReference,
  SavingsError,
} from "@/lib/savings";
import {
  requireUserId,
  readJson,
  parseIdempotencyKey,
  savingsErrorResponse,
} from "@/lib/savings-http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await readJson(req);

    const vault = await prisma.vault.findFirst({
      where: { id, userId },
      select: { id: true, status: true, currency: true, name: true, lockUntil: true },
    });
    if (!vault) throw new SavingsError("Coffre-fort introuvable.", 404);
    if (vault.status === "CLOSED") throw new SavingsError("Ce coffre est clôturé.");

    const amount = parseAmount(body.amount);
    const stillLocked = isVaultLocked(vault);

    const result = await postSavingsMovement({
      userId,
      target: { kind: "vault", id: vault.id },
      direction: "IN",
      amount,
      txType: "DEPOSIT",
      currency: vault.currency,
      description: `Dépôt coffre-fort — ${vault.name}`,
      note: typeof body.note === "string" ? body.note.slice(0, 140) : null,
      reference: buildReference("VLK", parseIdempotencyKey(body.idempotencyKey)),
      newStatus: stillLocked ? "LOCKED" : "ACTIVE",
    });

    return NextResponse.json({ success: true, isLocked: stillLocked, ...result });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}
