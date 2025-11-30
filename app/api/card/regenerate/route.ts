import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromToken } from "@/lib/auth";

export async function POST() {
  const userId = await getUserIdFromToken();

  const newNumber = "411111111111" + (Math.floor(1000 + Math.random() * 9000));

  const card = await prisma.virtualCard.update({
    where: { userId },
    data: { number: newNumber },
  });

  return NextResponse.json({ ok: true, card });
}