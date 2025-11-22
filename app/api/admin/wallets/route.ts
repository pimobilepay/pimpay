// app/api/admin/wallets/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getToken(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  return cookie.split("pimpay_token=")[1]?.split(";")[0];
}

export async function GET(req: Request) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const wallets = await prisma.wallet.findMany({ orderBy: { updatedAt: "desc" }, take: 200 });
  return NextResponse.json({ wallets });
}

export async function POST(req: Request) {
  const token = getToken(req);
  const decoded: any = verifyToken(token);
  if (!decoded || decoded.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { walletId, amount, action } = await req.json();
  if (!walletId || !amount || !["credit","debit"].includes(action)) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const wallet = await prisma.wallet.findUnique({ where: { id: walletId }});
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  const newBalance = action === "credit" ? wallet.balance + Number(amount) : wallet.balance - Number(amount);
  if (newBalance < 0) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

  await prisma.wallet.update({ where: { id: walletId }, data: { balance: newBalance }});
  // create transaction record
  const tx = await prisma.transaction.create({
    data: {
      amount: Number(amount),
      type: action === "credit" ? "DEPOSIT" : "WITHDRAW",
      status: "SUCCESS",
      reference: `ADMIN-${Date.now()}`,
      toWalletId: action === "credit" ? walletId : undefined,
      fromWalletId: action === "debit" ? walletId : undefined,
    }
  });

  return NextResponse.json({ wallet: { ...wallet, balance: newBalance }, tx });
}
