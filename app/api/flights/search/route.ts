import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const flight = searchParams.get("flight")?.trim().toUpperCase();
  const date = searchParams.get("date")?.trim();
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!flight || flight.length < 3) return NextResponse.json({ error: "Veuillez saisir un numéro de vol valide." }, { status: 400 });
  if (!apiKey) return NextResponse.json({ error: "Le suivi des vols est temporairement indisponible. Configurez AVIATIONSTACK_API_KEY côté serveur." }, { status: 503 });
  try {
    const endpoint = new URL("https://api.aviationstack.com/v1/flights");
    endpoint.searchParams.set("access_key", apiKey);
    endpoint.searchParams.set("flight_iata", flight);
    if (date) endpoint.searchParams.set("flight_date", date);
    endpoint.searchParams.set("limit", "10");
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.error) return NextResponse.json({ error: body?.error?.message ?? "Aviationstack est indisponible." }, { status: 503 });
    return NextResponse.json({ flights: body?.data ?? [] });
  } catch { return NextResponse.json({ error: "Impossible de joindre le service de suivi des vols." }, { status: 503 }); }
}

export async function POST() { return NextResponse.json({ error: "Utilisez GET pour rechercher un vol." }, { status: 405 }); }
