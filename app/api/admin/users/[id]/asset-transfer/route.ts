import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";
import { parseAmount } from "@/lib/amount-guard";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

const ADDRESS_PATTERNS: Record<string, RegExp> = {
  PI: /^G[A-Z2-7]{55}$/,
  XLM: /^G[A-Z2-7]{55}$/,
  SDA: /^0x[a-fA-F0-9]{40}$/,
  ETH: /^0x[a-fA-F0-9]{40}$/,
  BNB: /^0x[a-fA-F0-9]{40}$/,
  USDC: /^0x[a-fA-F0-9]{40}$/,
  DAI: /^0x[a-fA-F0-9]{40}$/,
  BUSD: /^0x[a-fA-F0-9]{40}$/,
  EURC: /^0x[a-fA-F0-9]{40}$/,
  OUSD: /^0x[a-fA-F0-9]{40}$/,
  USDT: /^T[a-zA-Z0-9]{33}$/,
  TRX: /^T[a-zA-Z0-9]{33}$/,
  XRP: /^r[a-zA-Z0-9]{24,33}$/,
  SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  BTC: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
  DOGE: /^D[a-km-zA-HJ-NP-Z1-9]{25,34}$/,
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission(req, PERMISSIONS.WITHDRAWALS_MANAGE);
  if (ctx instanceof NextResponse) return ctx;
  const { id: userId } = await params;
  const body = await req.json().catch(() => ({}));
  const currency = String(body.currency || "").toUpperCase();
  const address = String(body.address || "").trim();
  const parsed = parseAmount(body.amount);
  if (!parsed.ok || parsed.value <= 0) return NextResponse.json({ error: parsed.ok ? "Montant invalide" : parsed.error }, { status: 400 });
  if (!ADDRESS_PATTERNS[currency] || !ADDRESS_PATTERNS[currency].test(address)) return NextResponse.json({ error: `Adresse ${currency} invalide` }, { status: 400 });
  if (address.length > 200) return NextResponse.json({ error: "Adresse trop longue" }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId_currency: { userId, currency } } });
      if (!wallet || wallet.balance < parsed.value) throw new Error(`Solde ${currency} insuffisant`);
      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: parsed.value } } });
      const transaction = await tx.transaction.create({ data: {
        reference: `ADM-EXT-${nanoid(10).toUpperCase()}`, amount: parsed.value, netAmount: parsed.value,
        currency, type: "WITHDRAW", status: "SUCCESS", statusClass: "QUEUED",
        fromUserId: userId, fromWalletId: updated.id, accountNumber: address,
        description: String(body.note || `Transfert externe ${currency} par administrateur`).slice(0, 200),
        metadata: {
          externalAddress: address,
          destinationAddress: address,
          network: currency,
          isBlockchainWithdraw: true,
          initiatedByAdmin: ctx.payload.id,
          queuedAt: new Date().toISOString(),
        },
      } });
      return transaction;
    });
    await logAdminAction(req, ctx.payload, { action: "ADMIN_EXTERNAL_ASSET_TRANSFER", category: "withdrawals", targetType: "USER", targetId: userId, details: `${result.reference} · ${parsed.value} ${currency} · ${address.slice(0, 12)}…` });
    return NextResponse.json({ success: true, status: "PENDING", reference: result.reference, message: "Transfert enregistré et placé en file de traitement." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Transfert refusé" }, { status: 400 });
  }
}
