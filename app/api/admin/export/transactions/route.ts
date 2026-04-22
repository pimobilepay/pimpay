export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
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
