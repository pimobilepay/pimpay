import { priceFlight } from "./booking";
import type { FlightOffer } from "./types";

export function calculateServiceFee(baseFare: number) {
  const fixed = Number(process.env.FLIGHT_SERVICE_FEE_FIXED ?? 0);
  const percent = Number(process.env.FLIGHT_SERVICE_FEE_PERCENT ?? 0);
  return Math.round((Math.max(0, fixed) + baseFare * Math.max(0, percent) / 100) * 100) / 100;
}

export function breakdown(offer: FlightOffer) {
  const baseFare = Math.max(0, offer.price.amount);
  const taxes = 0;
  const serviceFee = calculateServiceFee(baseFare);
  return { baseFare, taxes, providerFees: 0, serviceFee, total: Math.round((baseFare + taxes + serviceFee) * 100) / 100, currency: offer.price.currency };
}

export async function getAuthoritativePrice(offerId: string) {
  const offer = await priceFlight(offerId);
  return offer ? { offer, ...breakdown(offer) } : null;
}
