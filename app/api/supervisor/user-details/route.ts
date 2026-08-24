import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { displayName, isSupervisorResponse, requireSupervisor } from "@/lib/supervisorAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireSupervisor(req);
  if (isSupervisorResponse(actor)) return actor;
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId requis." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, firstName: true, lastName: true, username: true, email: true,
      phone: true, avatar: true, country: true, city: true, address: true, nationality: true,
      gender: true, birthDate: true, occupation: true, role: true, status: true,
      kycStatus: true, kycSubmittedAt: true, kycVerifiedAt: true, createdAt: true,
      idType: true, idNumber: true, idCountry: true, idExpiryDate: true,
      wallets: { select: { currency: true, balance: true, frozenBalance: true }, orderBy: { balance: "desc" }, take: 6 },
      _count: { select: { transactionsFrom: true, transactionsTo: true, referrals: true, sessions: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  return NextResponse.json({ user: { ...user, displayName: displayName(user) } });
}
