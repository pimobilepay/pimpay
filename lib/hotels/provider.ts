import { HotelProviderError, type HotelProvider, type HotelResult, type HotelSearchRequest } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Provider hôtels basé sur l'API Duffel Stays (mêmes credentials que les vols :
// DUFFEL_ACCESS_TOKEN). La recherche est GÉOGRAPHIQUE : on envoie la position
// de l'utilisateur (latitude/longitude) et un rayon, Duffel renvoie les
// hébergements réservables aux alentours avec photos, notes et tarifs réels.
// ─────────────────────────────────────────────────────────────────────────────

function duffelHeaders() {
  const token = process.env.DUFFEL_ACCESS_TOKEN || process.env.FLIGHT_API_KEY;
  if (!token) throw new HotelProviderError("Hotel provider is not configured", "unavailable");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Duffel-Version": "v2" };
}

async function duffel(path: string, init: RequestInit) {
  try {
    const response = await fetch(`https://api.duffel.com${path}`, {
      ...init,
      headers: { ...duffelHeaders(), ...(init.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const code =
        response.status === 404
          ? "empty"
          : response.status === 401 || response.status === 403
            ? "invalid"
            : "unavailable";
      throw new HotelProviderError(
        code === "invalid"
          ? "La configuration du fournisseur d'hôtels est invalide."
          : (body?.errors?.[0]?.message ?? "Hotel provider request failed"),
        code,
      );
    }
    return body?.data;
  } catch (error) {
    if (error instanceof HotelProviderError) throw error;
    throw new HotelProviderError("Le fournisseur d'hôtels ne répond pas.", "unavailable");
  }
}

// Formule de haversine : distance (km) entre deux points GPS, pour trier les
// résultats du plus proche au plus éloigné de l'utilisateur.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapResult(result: any, origin: { lat: number; lng: number }): HotelResult {
  const accommodation = result.accommodation ?? {};
  const coords = accommodation.location?.geographic_coordinates ?? {};
  const address = accommodation.location?.address ?? {};
  const latitude = typeof coords.latitude === "number" ? coords.latitude : undefined;
  const longitude = typeof coords.longitude === "number" ? coords.longitude : undefined;
  return {
    id: result.id,
    accommodationId: accommodation.id ?? result.id,
    name: accommodation.name ?? "Hôtel",
    photos: (accommodation.photos ?? []).map((photo: any) => photo?.url).filter(Boolean),
    rating: typeof accommodation.rating === "number" ? accommodation.rating : undefined,
    reviewScore: typeof accommodation.review_score === "number" ? accommodation.review_score : undefined,
    reviewCount: typeof accommodation.reviews_count === "number" ? accommodation.reviews_count : undefined,
    address: address.line_one,
    city: address.city_name,
    country: address.country_code,
    latitude,
    longitude,
    amenities: (accommodation.amenities ?? []).map((amenity: any) => ({
      type: amenity?.type ?? "",
      description: amenity?.description,
    })),
    price: {
      amount: Number(result.cheapest_rate_total_amount ?? 0),
      currency: result.cheapest_rate_currency ?? "USD",
    },
    distanceKm:
      latitude !== undefined && longitude !== undefined
        ? Math.round(haversineKm(origin.lat, origin.lng, latitude, longitude) * 10) / 10
        : undefined,
  };
}

const provider: HotelProvider = {
  async searchHotels(request: HotelSearchRequest) {
    const guests = [
      ...Array.from({ length: request.guests.adults }, () => ({ type: "adult" as const })),
      ...Array.from({ length: request.guests.children }, () => ({ type: "adult" as const })),
    ];
    const data = await duffel("/stays/search", {
      method: "POST",
      body: JSON.stringify({
        data: {
          rooms: request.rooms,
          check_in_date: request.checkIn,
          check_out_date: request.checkOut,
          guests: guests.length > 0 ? guests : [{ type: "adult" }],
          location: {
            // Duffel attend le rayon en kilomètres
            radius: Math.max(1, Math.min(request.radiusKm, 50)),
            geographic_coordinates: { latitude: request.latitude, longitude: request.longitude },
          },
        },
      }),
    });
    const results = (data?.results ?? []).map((result: any) =>
      mapResult(result, { lat: request.latitude, lng: request.longitude }),
    );
    return results.sort(
      (a: HotelResult, b: HotelResult) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
    );
  },
  async getRates(searchResultId: string) {
    return duffel(`/stays/search_results/${encodeURIComponent(searchResultId)}/actions/fetch_all_rates`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};

export function getHotelProvider(): HotelProvider {
  return provider;
}

export function isHotelProviderConfigured() {
  return Boolean(process.env.DUFFEL_ACCESS_TOKEN || process.env.FLIGHT_API_KEY);
}
