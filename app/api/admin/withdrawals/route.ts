export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";
import { getPiPrice } from "@/lib/fees";
import { toUsd, DEFAULT_CRYPTO_PRICES, FIAT_RATES } from "@/lib/exchange";

// GET — whitelist d'adresses de retrait + cold wallets
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.WITHDRAWALS_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const [addresses, coldWallets, byStatus] = await Promise.all([
    prisma.withdrawalAddress.findMany({
      where: { ...(status && status !== "ALL" ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.coldWallet.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.withdrawalAddress.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  // Enrichir les adresses avec infos utilisateur
  const userIds = Array.from(new Set(addresses.map((a) => a.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, name: true, email: true, avatar: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Valorisation des cold wallets
  const piPrice = await getPiPrice();
  const priceMap: Record<string, number> = { ...DEFAULT_CRYPTO_PRICES, ...FIAT_RATES, PI: piPrice };
  const coldTotalUSD = coldWallets.reduce(
    (s, c) => s + (c.isActive ? toUsd(c.asset, c.balance, priceMap) : 0),
    0
  );

  return NextResponse.json({
    addresses: addresses.map((a) => ({ ...a, user: userMap.get(a.userId) || null })),
    coldWallets,
    stats: {
      pending: byStatus.find((s) => s.status === "PENDING")?._count.id || 0,
      approved: byStatus.find((s) => s.status === "APPROVED")?._count.id || 0,
      coldActive: coldWallets.filter((c) => c.isActive).length,
      coldTotalUSD,
    },
  });
}

// POST — gestion whitelist + cold wallets
export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.WITHDRAWALS_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  try {
    switch (action) {
      case "approveAddress": {
        const addr = await prisma.withdrawalAddress.update({
          where: { id: body.id },
          data: { status: "APPROVED", approvedBy: ctx.payload.id, approvedAt: new Date(), rejectReason: null },
        });
        await logAdminAction(req, ctx.payload, {
          action: "WITHDRAWAL_APPROVE_ADDRESS", category: "withdrawals", targetId: addr.userId,
          details: `${addr.asset} ${addr.address.slice(0, 12)}…`,
        });
        return NextResponse.json({ success: true, address: addr });
      }
      case "rejectAddress": {
        const addr = await prisma.withdrawalAddress.update({
          where: { id: body.id },
          data: { status: "REJECTED", rejectReason: body.reason || "Non conforme" },
        });
        await logAdminAction(req, ctx.payload, {
          action: "WITHDRAWAL_REJECT_ADDRESS", category: "withdrawals", targetId: addr.userId,
          details: `${addr.asset} rejetée`,
        });
        return NextResponse.json({ success: true, address: addr });
      }
      case "revokeAddress": {
        const addr = await prisma.withdrawalAddress.update({
          where: { id: body.id },
          data: { status: "REVOKED" },
        });
        await logAdminAction(req, ctx.payload, {
          action: "WITHDRAWAL_REVOKE_ADDRESS", category: "withdrawals", targetId: addr.userId,
          details: `${addr.asset} révoquée`,
        });
        return NextResponse.json({ success: true, address: addr });
      }
      case "createColdWallet": {
        const cw = await prisma.coldWallet.create({
          data: {
            asset: String(body.asset || "BTC").toUpperCase(),
            network: body.network || null,
            label: String(body.label || "Cold wallet"),
            address: String(body.address || ""),
            custodian: body.custodian || null,
            balance: Number(body.balance) || 0,
            note: body.note || null,
            createdBy: ctx.payload.id,
          },
        });
        await logAdminAction(req, ctx.payload, {
          action: "COLD_WALLET_CREATE", category: "withdrawals", details: `${cw.label} (${cw.asset})`,
        });
        return NextResponse.json({ success: true, coldWallet: cw });
      }
      case "updateColdBalance": {
        const cw = await prisma.coldWallet.update({
          where: { id: body.id },
          data: { balance: Number(body.balance) || 0, lastSyncAt: new Date() },
        });
        await logAdminAction(req, ctx.payload, {
          action: "COLD_WALLET_UPDATE", category: "withdrawals", details: `${cw.label} → ${cw.balance} ${cw.asset}`,
        });
        return NextResponse.json({ success: true, coldWallet: cw });
      }
      case "toggleColdWallet": {
        const cw = await prisma.coldWallet.update({
          where: { id: body.id },
          data: { isActive: !!body.isActive },
        });
        await logAdminAction(req, ctx.payload, {
          action: "COLD_WALLET_TOGGLE", category: "withdrawals", details: `${cw.label} = ${cw.isActive}`,
        });
        return NextResponse.json({ success: true, coldWallet: cw });
      }
      case "deleteColdWallet": {
        await prisma.coldWallet.delete({ where: { id: body.id } });
        await logAdminAction(req, ctx.payload, {
          action: "COLD_WALLET_DELETE", category: "withdrawals", details: body.id,
        });
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
  } catch (e: any) {
    console.error("WITHDRAWALS_ERROR:", e);
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 });
  }
}
