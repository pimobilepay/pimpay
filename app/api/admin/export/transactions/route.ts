export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: { fromUser: true, toUser: true }
    });

    // Génération du contenu CSV
    const header = "Date,Reference,Type,Montant,Frais,Statut,Emetteur,Destinataire\n";
    const rows = transactions.map(tx => {
      return `${tx.createdAt.toISOString()},${tx.reference},${tx.type},${tx.amount},${tx.fee},${tx.status},${tx.fromUser?.email || 'N/A'},${tx.toUser?.email || 'N/A'}`;
    }).join("\n");

    const csv = header + rows;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=transactions_pimpay_${new Date().toISOString().split('T')[0]}.csv`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur export" }, { status: 500 });
  }
}
