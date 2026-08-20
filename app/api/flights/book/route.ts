import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { getAuthoritativePrice } from "@/lib/flights/pricing";
import { bookFlight } from "@/lib/flights/booking";

const passenger = z.object({ firstName: z.string().trim().min(1).max(80), middleName: z.string().trim().max(80).optional().default(""), lastName: z.string().trim().min(1).max(80), dateOfBirth: z.string().date(), gender: z.enum(["male", "female", "other"]), nationality: z.string().length(2), email: z.string().email(), phone: z.string().min(6).max(30), documentNumber: z.string().min(3).max(40), issuingCountry: z.string().length(2), passportExpirationDate: z.string().date() });
const schema = z.object({ offerId: z.string().min(1).max(200), displayedAmount: z.number().finite().nonnegative(), tripType: z.string(), passengers: z.array(passenger).min(1).max(9), idempotencyKey: z.string().min(16).max(100) });

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (checkRateLimit(`flight-book:${userId}:${getClientIp(request)}`, 5, 60_000).limited) return NextResponse.json({ error: "Too many booking attempts" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid passenger or flight details" }, { status: 400 });
  const existing = await prisma.flightBooking.findFirst({ where: { userId, itinerary: { path: ["idempotencyKey"], equals: parsed.data.idempotencyKey } } });
  if (existing) return NextResponse.json({ bookingId: existing.id, status: existing.status, bookingReference: existing.bookingReference });
  const priced = await getAuthoritativePrice(parsed.data.offerId).catch(() => null);
  if (!priced) return NextResponse.json({ error: "Flight price is no longer available" }, { status: 409 });
  const wallet = await prisma.wallet.findUnique({ where: { userId_currency: { userId, currency: "PI" } } });
  if (!wallet || wallet.balance < priced.total) return NextResponse.json({ error: "Insufficient Pi balance", availableBalance: wallet?.balance ?? 0, amount: priced.total }, { status: 402 });
  const booking = await prisma.flightBooking.create({ data: { userId, tripType: parsed.data.tripType, currency: "PI", baseFare: priced.baseFare, taxes: priced.taxes, serviceFee: priced.serviceFee, totalAmount: priced.total, itinerary: { idempotencyKey: parsed.data.idempotencyKey, offer: priced.offer }, passengers: parsed.data.passengers, status: "PROCESSING" } });
  try {
    const providerBooking = await bookFlight({ offerId: parsed.data.offerId, passengers: parsed.data.passengers, amount: priced.baseFare, currency: priced.currency });
    const transaction = await prisma.$transaction(async (tx) => {
      const locked = await tx.wallet.updateMany({ where: { id: wallet.id, balance: { gte: priced.total } }, data: { balance: { decrement: priced.total } } });
      if (locked.count !== 1) throw new Error("Insufficient Pi balance");
      return tx.transaction.create({ data: { reference: `FL-${randomUUID()}`, amount: priced.total, fee: priced.serviceFee, currency: "PI", type: "FLIGHT_BOOKING", status: "SUCCESS", description: "Flight booking", fromUserId: userId, fromWalletId: wallet.id, externalId: providerBooking.bookingId, metadata: { bookingId: booking.id, provider: "DUFFEL" } } });
    });
    const confirmed = await prisma.flightBooking.update({ where: { id: booking.id }, data: { status: "CONFIRMED", providerBookingId: providerBooking.bookingId, bookingReference: providerBooking.bookingReference, paymentTransactionId: transaction.id } });
    return NextResponse.json({ bookingId: confirmed.id, bookingReference: confirmed.bookingReference, status: confirmed.status, airline: priced.offer.segments[0]?.airline, route: priced.offer.segments.map((s) => s.departure.airport.iata).concat(priced.offer.segments.at(-1)?.arrival.airport.iata ?? []).join(" → "), total: priced.total, currency: "PI" });
  } catch (error) {
    await prisma.flightBooking.update({ where: { id: booking.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Booking failed; your balance was not charged" }, { status: 502 });
  }
}
