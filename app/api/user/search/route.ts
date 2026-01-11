export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) return NextResponse.json({ error: "Query manquante" }, { status: 400 });

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: query },
          { username: query },
          { id: query }
        ]
      },
      select: { id: true, name: true, firstName: true, email: true }
    });

    if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
