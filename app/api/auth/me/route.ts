export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const token = cookies().get("token")?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        wallets: { where: { currency: "PI" }, select: { balance: true } }
      }
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: { ...user, balance: user.wallets[0]?.balance || 0 }
    });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
