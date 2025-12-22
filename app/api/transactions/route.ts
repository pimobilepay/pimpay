import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // ⚠️ Fake data (remplacera Prisma plus tard)
  const allTransactions = [
    { id: "TXN-1", type: "Dépôt", amount: 150, date: "2025-01-10", status: "success" },
    { id: "TXN-2", type: "Retrait", amount: 80, date: "2025-01-12", status: "pending" },
    { id: "TXN-3", type: "Recharge", amount: 10, date: "2025-01-13", status: "failed" },
  ];

  let data = [...allTransactions];

  if (type && type !== "Tous") {
    data = data.filter((t) => t.type === type);
  }

  if (from) data = data.filter((t) => t.date >= from);
  if (to) data = data.filter((t) => t.date <= to);

  const start = (page - 1) * limit;
  const paginated = data.slice(start, start + limit);

  return NextResponse.json({
    page,
    total: data.length,
    transactions: paginated,
  });
}
