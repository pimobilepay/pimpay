import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserId } from "@/lib/auth";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { searchFlights } from "@/lib/flights/search";
import { FlightProviderError } from "@/lib/flights/types";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/flights/search?flight=AF123&date=2026-08-22
// Suivi d'un vol par numéro (statut, horaires) via AviationStack.
// Fonctionnalité distincte de l'achat de billets — conservée telle quelle.
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/flights/search
// Recherche de billets d'avion achetables (origine/destination/date/
// passagers), via le vrai provider Duffel — celui utilisé par la page
// d'achat de billets (`components/mpay/flight-search.tsx`).
//
// ✅ FIX : cette route ne définissait AUPARAVANT aucune méthode POST — le
// handler renvoyait toujours `405 Utilisez GET pour rechercher un vol.`
// pour toute recherche de billets, avant même d'atteindre le fournisseur.
// Combiné aux bugs corrigés dans lib/flights/provider.ts (aéroports jamais
// suggérés, `return_offers` manquant), c'est ce qui empêchait TOUT
// affichage de résultats de recherche de vols.
// ─────────────────────────────────────────────────────────────────────────────
const searchSchema = z.object({
  tripType: z.enum(["round-trip", "one-way", "multi-city"]),
  from: z.string().trim().length(3),
  to: z.string().trim().length(3),
  departureDate: z.string().date(),
  returnDate: z.string().date().optional().or(z.literal("")),
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(9),
  infants: z.number().int().min(0).max(9),
  cabin: z.enum(["economy", "premium-economy", "business", "first"]),
});

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (checkRateLimit(`flight-search:${userId}:${getClientIp(request)}`, 30, 60_000).limited) {
    return NextResponse.json({ error: "Trop de recherches, réessayez dans un instant." }, { status: 429 });
  }

  const parsed = searchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres de recherche invalides." }, { status: 400 });
  }
  if (parsed.data.from.toUpperCase() === parsed.data.to.toUpperCase()) {
    return NextResponse.json({ error: "L'aéroport de départ et d'arrivée doivent être différents." }, { status: 400 });
  }

  try {
    const flights = await searchFlights({
      ...parsed.data,
      from: parsed.data.from.toUpperCase(),
      to: parsed.data.to.toUpperCase(),
      returnDate: parsed.data.returnDate || undefined,
    });
    return NextResponse.json({ flights });
  } catch (error) {
    if (error instanceof FlightProviderError) {
      const status = error.code === "unavailable" ? 503 : error.code === "empty" ? 200 : 502;
      if (status === 200) return NextResponse.json({ flights: [] });
      return NextResponse.json(
        { error: error.code === "unavailable" ? "La recherche de vols est temporairement indisponible. Réessayez plus tard." : error.message },
        { status }
      );
    }
    console.error("[FLIGHT_SEARCH_POST]:", error);
    return NextResponse.json({ error: "Impossible de rechercher des vols pour le moment." }, { status: 502 });
  }
}
