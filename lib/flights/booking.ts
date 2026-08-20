import { getFlightProvider } from "./provider";

export async function priceFlight(offerId: string) {
  return getFlightProvider().priceFlight(offerId);
}

export async function bookFlight(input: unknown) {
  return getFlightProvider().createBooking(input);
}
