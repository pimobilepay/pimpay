import { getFlightProvider } from "./provider";

export async function priceFlight(offerId: string) {
  return getFlightProvider().getPrice(offerId);
}
