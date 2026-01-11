export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import * as jose from "jose";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get("token")?.value;
    if (!token) return new NextResponse("Non autorisé", { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    // Supprimer la session seulement si elle appartient à l'utilisateur
    // et que ce n'est pas la session actuelle
    await prisma.session.deleteMany({
      where: {
        id: params.id,
        userId: userId,
        NOT: {
          token: token
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return new NextResponse("Erreur serveur", { status: 500 });
  }
}
