import { NextRequest, NextResponse } from "next/server";

// Mock en mémoire (exemple)
let balance = 1234.56;
let transactions: Array<{
  id: string;
  type: "Dépôt" | "Retrait" | "Transfert" | "Recharge";
  amount: number;
  date: string;
}> = Array.from({ length: 20 }, (_, i) => ({
  id: `TX-${1000 + i}`,
  type: ["Dépôt", "Retrait", "Transfert", "Recharge"][i % 4],
  amount: Math.floor(Math.random() * 5000) / 100,
  date: new Date(Date.now() - i * 1000 * 60 * 60).toLocaleString(),
}));

/* ================= GET ================= */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = 10;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return NextResponse.json({
      balance,
      transactions: transactions.slice(start, end),
      total: transactions.length,
      page,
      pageSize,
    });
  } catch (error) {
    return NextResponse.json({ error: "Impossible de récupérer le wallet" }, { status: 500 });
  }
}

/* ================= POST ================= */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, amount } = body;

    if (!type || !amount) {
      return NextResponse.json({ error: "Type et montant requis" }, { status: 400 });
    }

    if (type === "Transfert" && amount > balance) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    // Mettre à jour le solde
    if (type === "Recharge") balance += amount;
    if (type === "Transfert") balance -= amount;

    // Ajouter la transaction en tête
    const newTx = {
      id: `TX-${Date.now()}`,
      type,
      amount,
      date: new Date().toLocaleString(),
    };
    transactions = [newTx, ...transactions];

    return NextResponse.json({ balance, transaction: newTx });
  } catch (error) {
    return NextResponse.json({ error: "Impossible d'ajouter la transaction" }, { status: 500 });
  }
}
