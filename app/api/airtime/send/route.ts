import { NextResponse } from "next/server";
import { getReloadlyToken } from "@/lib/reloadly";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, amount, operatorId } = body;

    const token = await getReloadlyToken();

    // Recharge réelle
    const res = await fetch("https://topups.reloadly.com/topups", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/com.reloadly.topups-v1+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operatorId,
        amount,
        useLocalAmount: false,
        recipientPhone: { countryCode: "CD", number: phone }
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: 400 });
    }

    // Log transaction PIMPAY
    await prisma.transaction.create({
      data: {
        amount,
        type: "TRANSFER",
        status: "SUCCESS",
        reference: data.transactionId || `AT-${Date.now()}`
      },
    });

    return NextResponse.json({
      success: true,
      details: data,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
