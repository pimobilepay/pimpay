import { getFlightProvider } from "./provider";

export async function bookFlight(input: unknown) {
  return getFlightProvider().createBooking(input);
}
