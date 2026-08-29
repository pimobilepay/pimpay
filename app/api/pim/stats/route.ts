import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOTAL_SUPPLY = 100_000_000;

export async function GET() {
  try {
    const users = await prisma.user.count({
      where: { status: "ACTIVE" },
    });

    return NextResponse.json(
      { users, totalSupply: TOTAL_SUPPLY },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("[pim-stats] Failed to load stats", error);
    return NextResponse.json({ error: "Statistiques indisponibles" }, { status: 503 });
  }
}
