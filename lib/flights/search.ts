import { getFlightProvider } from "./provider";
import type { FlightSearchRequest } from "./types";

export async function searchAirports(query: string) {
  if (query.trim().length < 2) return [];
  return getFlightProvider().searchAirports(query.trim());
}

export async function searchFlights(request: FlightSearchRequest) {
  return getFlightProvider().searchFlights(request);
}
