import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserId } from "@/lib/auth";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { searchHotels } from "@/lib/hotels/search";
import { HotelProviderError } from "@/lib/hotels/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hotels/search
// Recherche géographique d'hôtels réservables autour d'une position
// (latitude/longitude + rayon), via l'API Duffel Stays. Utilisée par la carte
// OpenStreetMap de la page hôtels : la position vient de la géolocalisation du
// navigateur ou d'un point choisi sur la carte.
// ─────────────────────────────────────────────────────────────────────────────
const searchSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radiusKm: z.number().min(1).max(50),
    checkIn: z.string().date(),
    checkOut: z.string().date(),
    rooms: z.number().int().min(1).max(9),
    adults: z.number().int().min(1).max(16),
    children: z.number().int().min(0).max(16),
  })
  .superRefine((data, context) => {
    if (data.checkOut <= data.checkIn) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkOut"],
        message: "La date de départ doit être postérieure à l'arrivée.",
      });
    }
  });

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (checkRateLimit(`hotel-search:${userId}:${getClientIp(request)}`, 30, 60_000).limited) {
    return NextResponse.json({ error: "Trop de recherches, réessayez dans un instant." }, { status: 429 });
  }

  const parsed = searchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres de recherche invalides." }, { status: 400 });
  }

  try {
    const hotels = await searchHotels({
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      radiusKm: parsed.data.radiusKm,
      checkIn: parsed.data.checkIn,
      checkOut: parsed.data.checkOut,
      rooms: parsed.data.rooms,
      guests: { adults: parsed.data.adults, children: parsed.data.children },
    });
    return NextResponse.json({ hotels });
  } catch (error) {
    if (error instanceof HotelProviderError) {
      const status = error.code === "unavailable" ? 503 : error.code === "empty" ? 200 : 502;
      if (status === 200) return NextResponse.json({ hotels: [] });
      return NextResponse.json(
        {
          error:
            error.code === "invalid"
              ? "Le service de recherche d'hôtels est mal configuré. Vérifiez le fournisseur Duffel."
              : error.code === "unavailable"
                ? "La recherche d'hôtels est temporairement indisponible. Réessayez plus tard."
                : error.message,
        },
        { status: error.code === "invalid" ? 502 : status },
      );
    }
    console.error("[HOTEL_SEARCH_POST]:", error);
    return NextResponse.json({ error: "Impossible de rechercher des hôtels pour le moment." }, { status: 502 });
  }
}
