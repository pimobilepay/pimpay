import { NextResponse } from "next/server";

// Map of Pi Integration - Fetches merchants from Map of Pi ecosystem
// Note: This uses simulated data as Map of Pi's public API is accessed via Pi Browser

interface MapOfPiMerchant {
  id: string;
  name: string;
  category: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    country: string;
  };
  rating: number;
  reviewCount: number;
  avatar: string;
  piPaymentId: string;
  acceptsPi: boolean;
  verified: boolean;
  featuredImage?: string;
  businessHours?: string;
  contactPhone?: string;
  tags: string[];
}

// Simulated Map of Pi merchants data
// In production, this would connect to Map of Pi's backend via Pi Browser SDK
const MAP_OF_PI_MERCHANTS: MapOfPiMerchant[] = [
  {
    id: "mop-001",
    name: "Pi Cafe Dakar",
    category: "Restaurant",
    description: "Cafe et patisserie acceptant Pi - Specialites africaines",
    location: { lat: 14.6937, lng: -17.4441, address: "Avenue Cheikh Anta Diop", city: "Dakar", country: "Senegal" },
    rating: 4.8,
    reviewCount: 127,
    avatar: "PC",
    piPaymentId: "PIMPAY-CAFE01",
    acceptsPi: true,
    verified: true,
    businessHours: "07:00 - 22:00",
    tags: ["cafe", "restaurant", "wifi"]
  },
  {
    id: "mop-002",
    name: "TechPi Store",
    category: "Electronique",
    description: "Boutique electronique - Smartphones, accessoires, reparations",
    location: { lat: 14.7167, lng: -17.4677, address: "Rue Parcelles Assainies", city: "Dakar", country: "Senegal" },
    rating: 4.5,
    reviewCount: 89,
    avatar: "TP",
    piPaymentId: "PIMPAY-TECH02",
    acceptsPi: true,
    verified: true,
    businessHours: "09:00 - 20:00",
    tags: ["tech", "phones", "repair"]
  },
  {
    id: "mop-003",
    name: "Pi Market Express",
    category: "Supermarche",
    description: "Supermarche de proximite - Produits frais et locaux",
    location: { lat: 14.6928, lng: -17.4467, address: "Medina", city: "Dakar", country: "Senegal" },
    rating: 4.3,
    reviewCount: 234,
    avatar: "PM",
    piPaymentId: "PIMPAY-MKT03",
    acceptsPi: true,
    verified: true,
    businessHours: "06:00 - 23:00",
    tags: ["grocery", "fresh", "local"]
  },
  {
    id: "mop-004",
    name: "Pi Fashion Boutique",
    category: "Mode",
    description: "Vetements et accessoires tendance - Mode africaine",
    location: { lat: 14.6850, lng: -17.4380, address: "Plateau", city: "Dakar", country: "Senegal" },
    rating: 4.6,
    reviewCount: 156,
    avatar: "PF",
    piPaymentId: "PIMPAY-FASH04",
    acceptsPi: true,
    verified: true,
    businessHours: "10:00 - 19:00",
    tags: ["fashion", "clothes", "african"]
  },
  {
    id: "mop-005",
    name: "Pi Gas Station",
    category: "Carburant",
    description: "Station service - Carburant, lavage auto, boutique",
    location: { lat: 14.7200, lng: -17.4500, address: "Route de Rufisque", city: "Dakar", country: "Senegal" },
    rating: 4.2,
    reviewCount: 312,
    avatar: "PG",
    piPaymentId: "PIMPAY-GAS05",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["gas", "fuel", "carwash"]
  },
  {
    id: "mop-006",
    name: "Pi Pharmacy Plus",
    category: "Pharmacie",
    description: "Pharmacie agreee - Medicaments, parapharmacie",
    location: { lat: 14.6900, lng: -17.4400, address: "Point E", city: "Dakar", country: "Senegal" },
    rating: 4.9,
    reviewCount: 445,
    avatar: "PP",
    piPaymentId: "PIMPAY-PHARM06",
    acceptsPi: true,
    verified: true,
    businessHours: "08:00 - 21:00",
    tags: ["pharmacy", "health", "medicine"]
  },
  {
    id: "mop-007",
    name: "Pi Coiffure Elegance",
    category: "Beaute",
    description: "Salon de coiffure et beaute - Hommes et femmes",
    location: { lat: 14.7100, lng: -17.4600, address: "Almadies", city: "Dakar", country: "Senegal" },
    rating: 4.7,
    reviewCount: 98,
    avatar: "CE",
    piPaymentId: "PIMPAY-COIF07",
    acceptsPi: true,
    verified: true,
    businessHours: "09:00 - 20:00",
    tags: ["beauty", "hair", "salon"]
  },
  {
    id: "mop-008",
    name: "Pi Auto Services",
    category: "Automobile",
    description: "Garage auto - Reparations, entretien, pieces detachees",
    location: { lat: 14.7050, lng: -17.4550, address: "Zone Industrielle", city: "Dakar", country: "Senegal" },
    rating: 4.4,
    reviewCount: 67,
    avatar: "PA",
    piPaymentId: "PIMPAY-AUTO08",
    acceptsPi: true,
    verified: true,
    businessHours: "08:00 - 18:00",
    tags: ["auto", "repair", "mechanic"]
  },
  {
    id: "mop-009",
    name: "Pi Education Center",
    category: "Education",
    description: "Centre de formation - Langues, informatique, business",
    location: { lat: 14.6980, lng: -17.4420, address: "Fann Residence", city: "Dakar", country: "Senegal" },
    rating: 4.8,
    reviewCount: 189,
    avatar: "PE",
    piPaymentId: "PIMPAY-EDU09",
    acceptsPi: true,
    verified: true,
    businessHours: "08:00 - 17:00",
    tags: ["education", "training", "courses"]
  },
  {
    id: "mop-010",
    name: "Pi Restaurant Teranga",
    category: "Restaurant",
    description: "Restaurant africain - Thieboudienne, Yassa, grillades",
    location: { lat: 14.6870, lng: -17.4350, address: "Ngor", city: "Dakar", country: "Senegal" },
    rating: 4.9,
    reviewCount: 523,
    avatar: "RT",
    piPaymentId: "PIMPAY-REST10",
    acceptsPi: true,
    verified: true,
    businessHours: "11:00 - 23:00",
    tags: ["restaurant", "african", "teranga"]
  },
  {
    id: "mop-011",
    name: "Pi Mobile Repairs",
    category: "Electronique",
    description: "Reparation smartphones et tablettes - Toutes marques",
    location: { lat: 5.3600, lng: -4.0083, address: "Marcory", city: "Abidjan", country: "Cote d'Ivoire" },
    rating: 4.5,
    reviewCount: 78,
    avatar: "MR",
    piPaymentId: "PIMPAY-MOB11",
    acceptsPi: true,
    verified: true,
    businessHours: "09:00 - 19:00",
    tags: ["repair", "mobile", "phones"]
  },
  {
    id: "mop-012",
    name: "Pi Bakery Delice",
    category: "Boulangerie",
    description: "Boulangerie patisserie artisanale - Pain frais quotidien",
    location: { lat: 5.3167, lng: -4.0167, address: "Cocody", city: "Abidjan", country: "Cote d'Ivoire" },
    rating: 4.7,
    reviewCount: 201,
    avatar: "BD",
    piPaymentId: "PIMPAY-BAK12",
    acceptsPi: true,
    verified: true,
    businessHours: "06:00 - 20:00",
    tags: ["bakery", "bread", "pastry"]
  }
];

// Categories available on Map of Pi
const CATEGORIES = [
  "Tous",
  "Restaurant",
  "Electronique",
  "Supermarche",
  "Mode",
  "Carburant",
  "Pharmacie",
  "Beaute",
  "Automobile",
  "Education",
  "Boulangerie"
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const city = searchParams.get("city");
    const limit = parseInt(searchParams.get("limit") || "20");

    let merchants = [...MAP_OF_PI_MERCHANTS];

    // Filter by category
    if (category && category !== "Tous") {
      merchants = merchants.filter(m => m.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by search query
    if (search) {
      const searchLower = search.toLowerCase();
      merchants = merchants.filter(m => 
        m.name.toLowerCase().includes(searchLower) ||
        m.description.toLowerCase().includes(searchLower) ||
        m.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    // Filter by city
    if (city) {
      merchants = merchants.filter(m => 
        m.location.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    // Apply limit
    merchants = merchants.slice(0, limit);

    return NextResponse.json({
      success: true,
      source: "Map of Pi",
      count: merchants.length,
      categories: CATEGORIES,
      merchants: merchants.map(m => ({
        ...m,
        distance: Math.random() * 5 + 0.5, // Simulated distance in km
      }))
    });
  } catch (error) {
    console.error("Map of Pi API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch merchants from Map of Pi" },
      { status: 500 }
    );
  }
}
