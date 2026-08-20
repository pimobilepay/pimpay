import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserId } from "@/lib/auth";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { getAuthoritativePrice } from "@/lib/flights/pricing";

const schema = z.object({ offerId: z.string().trim().min(1).max(200), displayedAmount: z.number().finite().nonnegative().optional() });

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (checkRateLimit(`flight-price:${userId}:${getClientIp(request)}`, 20, 60_000).limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid flight offer" }, { status: 400 });
  try {
    const priced = await getAuthoritativePrice(parsed.data.offerId);
    if (!priced) return NextResponse.json({ error: "Flight offer is no longer available" }, { status: 404 });
    return NextResponse.json({ ...priced, priceChanged: parsed.data.displayedAmount !== undefined && Math.abs(parsed.data.displayedAmount - priced.baseFare) > 0.005 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to price flight" }, { status: 502 });
  }
}
