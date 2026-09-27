import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { getReloadlyToken } from "@/lib/reloadly";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(); if (!userId) return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    const body = await request.json(); const productId = Number(body.productId); const amount = Number(body.amount); const recipientEmail = String(body.recipientEmail ?? "");
    if (!Number.isInteger(productId) || !Number.isFinite(amount) || amount <= 0 || amount > 10000 || !/^\S+@\S+\.\S+$/.test(recipientEmail)) return NextResponse.json({ error: "Commande invalide" }, { status: 400 });
    const token = await getReloadlyToken();
    const orderResponse = await fetch("https://giftcards.reloadly.com/orders", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity: 1, unitPrice: amount, customIdentifier: `MPAY-${userId}-${Date.now()}`, recipientEmail }) });
    if (!orderResponse.ok) return NextResponse.json({ error: "La commande Reloadly a été refusée" }, { status: 502 });
    const order = await orderResponse.json();
    await prisma.transaction.create({ data: { reference: `GIFT-${order.id ?? Date.now()}`, amount, currency: "USD", type: "CARD_PURCHASE", description: `Gift card Reloadly #${productId}`, status: "SUCCESS", fromUserId: userId, metadata: { provider: "reloadly", productId, recipientEmail, orderId: order.id ?? null } } });
    return NextResponse.json({ success: true, order });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Achat impossible" }, { status: 400 }); }
}
