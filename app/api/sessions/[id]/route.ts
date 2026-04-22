export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    const userId = await getAuthUserId();
    if (!userId) return new NextResponse("Non autorise", { status: 401 });

    const { id } = await params;

    // Supprimer la session seulement si elle appartient a l'utilisateur
    // et que ce n'est pas la session actuelle
    await prisma.session.deleteMany({
      where: {
        id: id,
        userId: userId,
        NOT: {
          token: token,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return new NextResponse("Erreur serveur", { status: 500 });
  }
}
