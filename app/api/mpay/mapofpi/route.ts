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
  },
  // E-Commerce International
  {
    id: "mop-013",
    name: "Amazon Pi Store",
    category: "E-Commerce",
    description: "Marketplace mondial - Livraison internationale, millions de produits",
    location: { lat: 47.6062, lng: -122.3321, address: "410 Terry Avenue", city: "Seattle", country: "USA" },
    rating: 4.6,
    reviewCount: 12500,
    avatar: "AZ",
    piPaymentId: "PIMPAY-AMZ13",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["ecommerce", "marketplace", "global", "delivery"]
  },
  {
    id: "mop-014",
    name: "Alibaba Pi Gateway",
    category: "E-Commerce",
    description: "Commerce B2B et B2C - Produits en gros, AliExpress",
    location: { lat: 30.2741, lng: 120.1551, address: "969 West Wen Yi Road", city: "Hangzhou", country: "China" },
    rating: 4.4,
    reviewCount: 8900,
    avatar: "AL",
    piPaymentId: "PIMPAY-ALI14",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["ecommerce", "wholesale", "b2b", "aliexpress"]
  },
  {
    id: "mop-015",
    name: "eBay Pi Marketplace",
    category: "E-Commerce",
    description: "Ventes aux encheres et achat immediat - Neuf et occasion",
    location: { lat: 37.3382, lng: -121.8863, address: "2025 Hamilton Ave", city: "San Jose", country: "USA" },
    rating: 4.3,
    reviewCount: 6700,
    avatar: "EB",
    piPaymentId: "PIMPAY-EBY15",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["ecommerce", "auction", "marketplace", "secondhand"]
  },
  {
    id: "mop-016",
    name: "Jumia Pi Africa",
    category: "E-Commerce",
    description: "E-commerce africain - Electronique, mode, maison",
    location: { lat: 6.5244, lng: 3.3792, address: "Herbert Macaulay Way", city: "Lagos", country: "Nigeria" },
    rating: 4.2,
    reviewCount: 3400,
    avatar: "JM",
    piPaymentId: "PIMPAY-JUM16",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["ecommerce", "africa", "electronics", "fashion"]
  },
  {
    id: "mop-017",
    name: "Shopify Pi Stores",
    category: "E-Commerce",
    description: "Boutiques en ligne independantes - Milliers de vendeurs",
    location: { lat: 45.4215, lng: -75.6972, address: "150 Elgin Street", city: "Ottawa", country: "Canada" },
    rating: 4.5,
    reviewCount: 4500,
    avatar: "SP",
    piPaymentId: "PIMPAY-SHP17",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["ecommerce", "stores", "independent", "online"]
  },
  // Services numeriques
  {
    id: "mop-018",
    name: "Netflix Pi",
    category: "Streaming",
    description: "Streaming video - Films, series, documentaires",
    location: { lat: 34.0522, lng: -118.2437, address: "5808 Sunset Blvd", city: "Los Angeles", country: "USA" },
    rating: 4.7,
    reviewCount: 15000,
    avatar: "NF",
    piPaymentId: "PIMPAY-NFX18",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["streaming", "movies", "series", "entertainment"]
  },
  {
    id: "mop-019",
    name: "Spotify Pi Music",
    category: "Streaming",
    description: "Streaming musical - Musique, podcasts, playlists",
    location: { lat: 59.3293, lng: 18.0686, address: "Regeringsgatan 19", city: "Stockholm", country: "Sweden" },
    rating: 4.8,
    reviewCount: 9800,
    avatar: "SF",
    piPaymentId: "PIMPAY-SPT19",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["streaming", "music", "podcasts", "audio"]
  },
  {
    id: "mop-020",
    name: "Uber Pi Rides",
    category: "Transport",
    description: "VTC et livraison - Transport urbain, Uber Eats",
    location: { lat: 37.7749, lng: -122.4194, address: "1455 Market St", city: "San Francisco", country: "USA" },
    rating: 4.1,
    reviewCount: 8500,
    avatar: "UB",
    piPaymentId: "PIMPAY-UBR20",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["transport", "taxi", "delivery", "urban"]
  },
  {
    id: "mop-021",
    name: "Airbnb Pi Stay",
    category: "Hebergement",
    description: "Location courte duree - Appartements, maisons, experiences",
    location: { lat: 37.7749, lng: -122.4194, address: "888 Brannan St", city: "San Francisco", country: "USA" },
    rating: 4.6,
    reviewCount: 7200,
    avatar: "AB",
    piPaymentId: "PIMPAY-ABB21",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["hotel", "rental", "vacation", "experiences"]
  },
  {
    id: "mop-022",
    name: "Booking Pi Hotels",
    category: "Hebergement",
    description: "Reservation hotels - Hotels, vols, voitures",
    location: { lat: 52.3676, lng: 4.9041, address: "Herengracht 597", city: "Amsterdam", country: "Netherlands" },
    rating: 4.5,
    reviewCount: 11000,
    avatar: "BK",
    piPaymentId: "PIMPAY-BOK22",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["hotel", "booking", "travel", "flights"]
  },
  // Alimentation et livraison
  {
    id: "mop-023",
    name: "Glovo Pi Delivery",
    category: "Livraison",
    description: "Livraison rapide - Restaurants, courses, colis",
    location: { lat: 41.3874, lng: 2.1686, address: "Carrer de Pallars", city: "Barcelona", country: "Spain" },
    rating: 4.2,
    reviewCount: 3200,
    avatar: "GL",
    piPaymentId: "PIMPAY-GLV23",
    acceptsPi: true,
    verified: true,
    businessHours: "08:00 - 00:00",
    tags: ["delivery", "food", "groceries", "courier"]
  },
  {
    id: "mop-024",
    name: "McDonald's Pi",
    category: "Fast-Food",
    description: "Restauration rapide - Burgers, frites, desserts",
    location: { lat: 41.8781, lng: -87.6298, address: "110 N Carpenter St", city: "Chicago", country: "USA" },
    rating: 4.0,
    reviewCount: 25000,
    avatar: "MC",
    piPaymentId: "PIMPAY-MCD24",
    acceptsPi: true,
    verified: true,
    businessHours: "06:00 - 23:00",
    tags: ["fastfood", "burgers", "restaurant", "quick"]
  },
  {
    id: "mop-025",
    name: "Starbucks Pi Coffee",
    category: "Cafe",
    description: "Cafe premium - Boissons, patisseries, wifi",
    location: { lat: 47.5801, lng: -122.3359, address: "2401 Utah Ave S", city: "Seattle", country: "USA" },
    rating: 4.4,
    reviewCount: 18000,
    avatar: "SB",
    piPaymentId: "PIMPAY-STB25",
    acceptsPi: true,
    verified: true,
    businessHours: "05:00 - 22:00",
    tags: ["cafe", "coffee", "drinks", "wifi"]
  },
  // Tech et Gaming
  {
    id: "mop-026",
    name: "Steam Pi Gaming",
    category: "Gaming",
    description: "Plateforme de jeux PC - Jeux, DLC, communaute",
    location: { lat: 47.6101, lng: -122.2015, address: "10400 NE 4th St", city: "Bellevue", country: "USA" },
    rating: 4.7,
    reviewCount: 14000,
    avatar: "ST",
    piPaymentId: "PIMPAY-STM26",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["gaming", "games", "pc", "digital"]
  },
  {
    id: "mop-027",
    name: "Apple Pi Store",
    category: "Electronique",
    description: "Produits Apple - iPhone, Mac, iPad, services",
    location: { lat: 37.3318, lng: -122.0312, address: "Apple Park", city: "Cupertino", country: "USA" },
    rating: 4.8,
    reviewCount: 22000,
    avatar: "AP",
    piPaymentId: "PIMPAY-APL27",
    acceptsPi: true,
    verified: true,
    businessHours: "10:00 - 21:00",
    tags: ["tech", "apple", "iphone", "mac"]
  },
  {
    id: "mop-028",
    name: "Samsung Pi Electronics",
    category: "Electronique",
    description: "Electronique Samsung - Smartphones, TV, electromenager",
    location: { lat: 37.5665, lng: 126.9780, address: "Seocho-gu", city: "Seoul", country: "South Korea" },
    rating: 4.5,
    reviewCount: 16000,
    avatar: "SS",
    piPaymentId: "PIMPAY-SAM28",
    acceptsPi: true,
    verified: true,
    businessHours: "09:00 - 20:00",
    tags: ["tech", "samsung", "phones", "electronics"]
  },
  // Services financiers
  {
    id: "mop-029",
    name: "PayPal Pi Transfer",
    category: "Finance",
    description: "Transfert d'argent international - Paiements en ligne",
    location: { lat: 37.3382, lng: -121.8863, address: "2211 N First St", city: "San Jose", country: "USA" },
    rating: 4.3,
    reviewCount: 9500,
    avatar: "PP",
    piPaymentId: "PIMPAY-PPL29",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["finance", "transfer", "payment", "online"]
  },
  {
    id: "mop-030",
    name: "Wave Pi Mobile Money",
    category: "Finance",
    description: "Mobile money africain - Transferts, paiements, epargne",
    location: { lat: 14.6937, lng: -17.4441, address: "Almadies", city: "Dakar", country: "Senegal" },
    rating: 4.6,
    reviewCount: 5600,
    avatar: "WV",
    piPaymentId: "PIMPAY-WAV30",
    acceptsPi: true,
    verified: true,
    businessHours: "24/7",
    tags: ["finance", "mobile", "money", "africa"]
  }
];

// Categories available on Map of Pi
const CATEGORIES = [
  "Tous",
  "E-Commerce",
  "Restaurant",
  "Electronique",
  "Streaming",
  "Fast-Food",
  "Finance",
  "Transport",
  "Hebergement",
  "Livraison",
  "Gaming",
  "Cafe",
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
