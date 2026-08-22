import { FlightProviderError, type FlightOffer, type FlightProvider, type FlightSearchRequest } from "./types";
import { searchAirportsLocal } from "./airports-data";

type DuffelOffer = { id: string; total_amount: string; total_currency: string; slices?: any[] };
function duffelHeaders() { const token = process.env.DUFFEL_ACCESS_TOKEN || process.env.FLIGHT_API_KEY; if (!token) throw new FlightProviderError("Flight provider is not configured", "unavailable"); return { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Duffel-Version": "v2" }; }
async function duffel(path: string, init: RequestInit) { const response = await fetch(`https://api.duffel.com${path}`, { ...init, headers: { ...duffelHeaders(), ...(init.headers ?? {}) }, cache: "no-store", signal: AbortSignal.timeout(15000) }); const body = await response.json().catch(() => null); if (!response.ok) throw new FlightProviderError(body?.errors?.[0]?.message ?? "Flight provider request failed", response.status === 404 ? "empty" : "unavailable"); return body?.data; }
function mapOffer(offer: DuffelOffer): FlightOffer { const segments = (offer.slices ?? []).flatMap((slice: any) => (slice.segments ?? []).map((segment: any) => ({ flightNumber: `${segment.marketing_carrier?.iata_code ?? ""}${segment.marketing_carrier_flight_number ?? ""}`, airline: segment.marketing_carrier?.name ?? "Airline", airlineLogo: segment.marketing_carrier?.logo_symbol_url, departure: { time: segment.departing_at, airport: { iata: segment.origin?.iata_code ?? "", city: segment.origin?.city_name ?? "", name: segment.origin?.name ?? "", country: segment.origin?.country_code ?? "" } }, arrival: { time: segment.arriving_at, airport: { iata: segment.destination?.iata_code ?? "", city: segment.destination?.city_name ?? "", name: segment.destination?.name ?? "", country: segment.destination?.country_code ?? "" } }, durationMinutes: Math.max(0, Math.round((new Date(segment.arriving_at).getTime() - new Date(segment.departing_at).getTime()) / 60000)), baggage: "Cabin baggage included" }))); return { id: offer.id, segments, stops: Math.max(0, segments.length - (offer.slices?.length ?? 1)), totalDurationMinutes: segments.reduce((sum, segment) => sum + segment.durationMinutes, 0), baggage: "Cabin baggage included", price: { amount: Number(offer.total_amount), currency: offer.total_currency } }; }
const CABIN_MAP: Record<string, string> = { economy: "economy", "premium-economy": "premium_economy", business: "business", first: "first" };

const provider: FlightProvider = {
 // ✅ FIX : renvoyait toujours [] auparavant → l'autocomplete "From/To" ne
 // proposait jamais aucun aéroport, ce qui empêchait TOUTE recherche de vol
 // (le formulaire refusait de soumettre sans from/to valides).
 async searchAirports(query: string) { return searchAirportsLocal(query); },
 async searchFlights(request: FlightSearchRequest) {
   // ✅ FIX : deux bugs empêchaient TOUJOURS l'affichage de résultats,
   // même avec une clé Duffel valide et des aéroports correctement choisis :
   //   1) La requête n'ajoutait jamais `return_offers=true` : sans ce
   //      paramètre, Duffel crée la "offer request" mais ne renvoie PAS
   //      les offres dans la même réponse → `data.offers` était toujours
   //      undefined → toujours [].
   //   2) Les types de passagers/cabine ne respectaient pas le format
   //      attendu par Duffel ("infant_without_seat" et non "infant",
   //      "premium_economy" avec underscore et non "premium-economy").
   //      Une requête mal formée est rejetée (400) et remonte comme une
   //      recherche vide côté UI.
   const passengers = Array.from(
     { length: request.adults + request.children + request.infants },
     (_, index) => ({
       type:
         index < request.adults
           ? "adult"
           : index < request.adults + request.children
             ? "child"
             : "infant_without_seat",
     })
   );
   const slices: any[] = [{ origin: request.from, destination: request.to, departure_date: request.departureDate }];
   if (request.tripType === "round-trip" && request.returnDate) {
     slices.push({ origin: request.to, destination: request.from, departure_date: request.returnDate });
   }
   const data = await duffel("/air/offer_requests?return_offers=true&supplier_timeout=20000", {
     method: "POST",
     body: JSON.stringify({
       data: { slices, passengers, cabin_class: CABIN_MAP[request.cabin] ?? "economy" },
     }),
   });
   return (data?.offers ?? []).map(mapOffer);
 },
 // ✅ FIX : `/air/offers/{id}/price` n'existe pas côté Duffel (toujours 404
 // avant repli sur le GET) — on appelle directement le vrai endpoint pour
 // éviter un aller-retour réseau inutile à chaque tarification.
 async priceFlight(offerId) { const data = await duffel(`/air/offers/${encodeURIComponent(offerId)}`, { method: "GET" }); return data ? mapOffer(data) : null; },
 async createBooking(input: any) { const data = await duffel("/air/orders", { method: "POST", body: JSON.stringify({ data: { selected_offers: [input.offerId], passengers: input.passengers, payments: [{ type: "balance", amount: String(input.amount), currency: input.currency }] } }) }); return { bookingId: data.id, status: data.booking_reference ? "CONFIRMED" : "PROCESSING", bookingReference: data.booking_reference }; },
 async getBooking(bookingId) { return duffel(`/air/orders/${encodeURIComponent(bookingId)}`, { method: "GET" }); },
 async cancelBooking(bookingId) { return duffel(`/air/order_cancellations`, { method: "POST", body: JSON.stringify({ data: { order_id: bookingId } }) }); },
};
export function getFlightProvider(): FlightProvider { return provider; }
export function isFlightProviderConfigured() { return Boolean(process.env.DUFFEL_ACCESS_TOKEN || process.env.FLIGHT_API_KEY); }
export { mapOffer };
