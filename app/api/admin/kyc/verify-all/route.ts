import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // Mise à jour massive des utilisateurs en attente
    const result = await prisma.user.updateMany({
      where: { kycStatus: "PENDING" },
      data: { 
        kycStatus: "VERIFIED",
        kycVerifiedAt: new Date(),
        status: "ACTIVE"
      }
    });

    // Création d'un log d'audit
    await prisma.auditLog.create({
      data: {
        adminId: payload.id as string,
        adminName: payload.name as string,
        action: "VERIFY_ALL_KYC",
        details: `${result.count} utilisateurs approuvés.`
      }
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la validation" }, { status: 500 });
  }
}
