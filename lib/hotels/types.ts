export interface HotelGuests {
  adults: number;
  children: number;
}

export interface HotelSearchRequest {
  /** Coordonnées du centre de recherche (position de l'utilisateur ou ville) */
  latitude: number;
  longitude: number;
  /** Rayon de recherche en kilomètres autour du point */
  radiusKm: number;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: HotelGuests;
}

export interface HotelAmenity {
  type: string;
  description?: string;
}

export interface HotelResult {
  /** Identifiant de résultat de recherche Duffel (éphémère, utilisé au checkout) */
  id: string;
  accommodationId: string;
  name: string;
  photos: string[];
  /** Étoiles officielles (0-5) */
  rating?: number;
  /** Note des voyageurs (0-10) */
  reviewScore?: number;
  reviewCount?: number;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  amenities: HotelAmenity[];
  /** Prix total du séjour pour les critères recherchés */
  price: { amount: number; currency: string };
  /** Distance en km depuis le centre de recherche */
  distanceKm?: number;
}

export interface HotelProvider {
  searchHotels(request: HotelSearchRequest): Promise<HotelResult[]>;
  getRates(searchResultId: string): Promise<unknown>;
}

export class HotelProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "unavailable" | "invalid" | "forbidden" | "empty" = "unavailable",
  ) {
    super(message);
    this.name = "HotelProviderError";
  }
}
