export type TripType = "round-trip" | "one-way" | "multi-city";
export type CabinClass = "economy" | "premium-economy" | "business" | "first";

export interface Airport {
  city: string;
  name: string;
  iata: string;
  country: string;
}

export interface FlightSearchRequest {
  tripType: TripType;
  from: string;
  to: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabin: CabinClass;
}

export interface FlightSegment {
  flightNumber: string;
  airline: string;
  airlineLogo?: string;
  departure: { time: string; airport: Airport };
  arrival: { time: string; airport: Airport };
  durationMinutes: number;
  baggage?: string;
}

export interface FlightOffer {
  id: string;
  segments: FlightSegment[];
  stops: number;
  totalDurationMinutes: number;
  baggage: string;
  price: { amount: number; currency: string };
}

export interface FlightProvider {
  searchAirports(query: string): Promise<Airport[]>;
  searchFlights(request: FlightSearchRequest): Promise<FlightOffer[]>;
  getPrice(offerId: string): Promise<FlightOffer | null>;
  createBooking(input: unknown): Promise<{ bookingId: string; status: string }>;
}

export class FlightProviderError extends Error {
  constructor(message: string, public readonly code: "unavailable" | "invalid" | "empty" = "unavailable") {
    super(message);
    this.name = "FlightProviderError";
  }
}
