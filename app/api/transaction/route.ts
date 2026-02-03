export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma"; // À décommenter quand Prisma sera prêt

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Number(searchParams.get("limit") || 10);
    const type = searchParams.get("type");

    /* QUAND TU SERAS PRÊT POUR LE RÉEL :
       const transactions = await prisma.transaction.findMany({
         where: { ... filtres },
         skip: (page - 1) * limit,
         take: limit,
         orderBy: { createdAt: 'desc' }
       });
    */

    // Données temporaires formatées proprement pour Pimpay
    const allTransactions = [
      { id: "TXN-SDA-01", type: "Dépôt", amount: 0.888, currency: "SDA", date: "2026-02-03", status: "success" },
      { id: "TXN-SDA-02", type: "Dépôt", amount: 150.00, currency: "XAF", date: "2026-02-02", status: "success" },
    ];

    // Logique de filtrage...
    let data = [...allTransactions];
    if (type && type !== "Tous") {
      data = data.filter((t) => t.type === type);
    }

    const start = (page - 1) * limit;
    const paginated = data.slice(start, start + limit);

    return NextResponse.json({
      page,
      total: data.length,
      transactions: paginated,
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur Pimpay" }, { status: 500 });
  }
}
