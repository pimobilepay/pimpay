import { NextResponse } from "next/server";
import { z } from "zod";
import { searchFlights } from "@/lib/flights/search";
import { FlightProviderError } from "@/lib/flights/types";

const requestSchema = z.object({
  tripType: z.enum(["round-trip", "one-way", "multi-city"]),
  from: z.string().trim().min(3).max(3),
  to: z.string().trim().min(3).max(3),
  departureDate: z.string().date(),
  returnDate: z.string().date().optional(),
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(9),
  infants: z.number().int().min(0).max(9),
  cabin: z.enum(["economy", "premium-economy", "business", "first"]),
}).superRefine((value, ctx) => {
  if (value.from.toUpperCase() === value.to.toUpperCase()) {
    ctx.addIssue({ code: "custom", path: ["to"], message: "Departure and arrival airports must differ" });
  }
  if (value.tripType === "round-trip" && !value.returnDate) {
    ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Return date is required" });
  }
  if (value.returnDate && value.returnDate < value.departureDate) {
    ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Return date must be after departure" });
  }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid flight search", issues: parsed.error.flatten() }, { status: 400 });
    }
    const flights = await searchFlights({ ...parsed.data, from: parsed.data.from.toUpperCase(), to: parsed.data.to.toUpperCase() });
    return NextResponse.json({ flights });
  } catch (error) {
    if (error instanceof FlightProviderError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    }
    return NextResponse.json({ error: "Flight search is temporarily unavailable", code: "unavailable" }, { status: 503 });
  }
}
