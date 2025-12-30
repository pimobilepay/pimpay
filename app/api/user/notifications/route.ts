import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return NextResponse.json(notifications);
}

// Route pour marquer comme lu
export async function PATCH(req: Request) {
  const session = await auth();
  const { id } = await req.json();
  
  await prisma.notification.update({
    where: { id, userId: session?.user?.id },
    data: { read: true }
  });

  return NextResponse.json({ success: true });
}
