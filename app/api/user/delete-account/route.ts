import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function DELETE() {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("USER_ACCOUNT_DELETE_ERROR", error);
    return NextResponse.json({ error: "Le compte ne peut pas être supprimé pour le moment." }, { status: 500 });
  }
}
