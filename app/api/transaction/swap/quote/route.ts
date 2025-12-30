import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauth" }, { status: 401 });

  const { amount, targetCurrency } = await req.json();
  
  // Simulation de récupération de prix réel (ex: 31.41)
  const currentRate = 31.4159; 
  const convertedAmount = parseFloat(amount) * currentRate;

  // Créer un devis valable 30 secondes
  const quote = await prisma.swapQuote.create({
    data: {
      userId: session.user.id,
      fromAmount: parseFloat(amount),
      toAmount: convertedAmount,
      rate: currentRate,
      targetCurrency,
      expiresAt: new Date(Date.now() + 30 * 1000), // +30 secondes
    }
  });

  return NextResponse.json({
    quoteId: quote.id,
    rate: currentRate,
    convertedAmount,
    expiresIn: 30
  });
}
