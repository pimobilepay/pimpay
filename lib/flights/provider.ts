import { FlightProviderError, type FlightProvider } from "./types";

export function getFlightProvider(): FlightProvider {
  const provider = process.env.FLIGHT_PROVIDER?.toLowerCase();
  if (!provider || !process.env.FLIGHT_API_KEY) {
    throw new FlightProviderError("Flight provider is not configured", "unavailable");
  }

  // Provider adapters are intentionally isolated here. Add Duffel/Amadeus
  // implementations without exposing credentials to the browser.
  throw new FlightProviderError(`Unsupported flight provider: ${provider}`, "unavailable");
}
