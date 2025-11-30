import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromToken } from "@/lib/auth";

export async function POST() {
  const userId = await getUserIdFromToken();

  const card = await prisma.virtualCard.findUnique({ where: { userId } });

  const updated = await prisma.virtualCard.update({
    where: { userId },
    data: { locked: !card?.locked },
  });

  return NextResponse.json({ card: updated });
}