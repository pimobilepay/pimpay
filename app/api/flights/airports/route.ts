import { NextResponse } from "next/server";
import { searchAirports } from "@/lib/flights/search";
import { FlightProviderError } from "@/lib/flights/types";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ airports: [] });
  try {
    return NextResponse.json({ airports: await searchAirports(query) });
  } catch (error) {
    const isProviderError = error instanceof FlightProviderError;
    return NextResponse.json(
      { error: isProviderError ? error.message : "Airport search is temporarily unavailable", code: "unavailable" },
      { status: 503 },
    );
  }
}
