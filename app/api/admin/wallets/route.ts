export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);

    // Vérification du rôle ADMIN
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        sidraAddress: true,
        xrpAddress: true,
        xlmAddress: true,
        kycStatus: true,
        // On ne sélectionne JAMAIS les clés privées ici
      },
      take: 50
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
