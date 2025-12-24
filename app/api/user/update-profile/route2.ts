import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const payload = verifyAuth(req) as any;
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, email, country, city, address } = body;

    const updatedUser = await prisma.user.update({
      where: { id: payload.id },
      data: {
        firstName,
        lastName,
        email,
        country,
        city,
        address
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
