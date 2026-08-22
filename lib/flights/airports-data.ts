// lib/flights/airports-data.ts
//
// ✅ FIX : `provider.searchAirports()` renvoyait toujours un tableau vide
// (`async searchAirports() { return []; }`), donc l'autocomplete "From/To"
// de la page d'achat de billets n'affichait JAMAIS aucune suggestion.
// Résultat concret : l'utilisateur ne pouvait jamais sélectionner
// d'aéroport valide, donc le formulaire refusait de soumettre la
// recherche ("Select valid departure and arrival airports.") — et c'est
// la VRAIE raison pour laquelle "aucun résultat de recherche" n'apparaissait
// jamais, avant même d'atteindre l'API de recherche de vols.
//
// Duffel ne propose pas de vrai endpoint public "places"/"airports" fiable
// pour ce cas d'usage ; on embarque donc une liste statique des principaux
// aéroports mondiaux (avec une bonne couverture Afrique/Europe/Amériques/
// Asie) et on fait une recherche floue dessus. Facile à étendre plus tard.

export interface AirportRecord {
  iata: string;
  city: string;
  name: string;
  country: string;
}

export const AIRPORTS: AirportRecord[] = [
  // Afrique
  { iata: "BZV", city: "Brazzaville", name: "Maya-Maya Airport", country: "CG" },
  { iata: "FIH", city: "Kinshasa", name: "N'djili Airport", country: "CD" },
  { iata: "PNR", city: "Pointe-Noire", name: "Agostinho Neto Airport", country: "CG" },
  { iata: "LOS", city: "Lagos", name: "Murtala Muhammed Airport", country: "NG" },
  { iata: "ABV", city: "Abuja", name: "Nnamdi Azikiwe Airport", country: "NG" },
  { iata: "ACC", city: "Accra", name: "Kotoka Airport", country: "GH" },
  { iata: "ABJ", city: "Abidjan", name: "Félix-Houphouët-Boigny Airport", country: "CI" },
  { iata: "DKR", city: "Dakar", name: "Blaise Diagne Airport", country: "SN" },
  { iata: "DLA", city: "Douala", name: "Douala International Airport", country: "CM" },
  { iata: "NSI", city: "Yaoundé", name: "Yaoundé Nsimalen Airport", country: "CM" },
  { iata: "LBV", city: "Libreville", name: "Léon-Mba Airport", country: "GA" },
  { iata: "NBO", city: "Nairobi", name: "Jomo Kenyatta Airport", country: "KE" },
  { iata: "ADD", city: "Addis Ababa", name: "Bole International Airport", country: "ET" },
  { iata: "JNB", city: "Johannesburg", name: "O.R. Tambo Airport", country: "ZA" },
  { iata: "CPT", city: "Cape Town", name: "Cape Town International Airport", country: "ZA" },
  { iata: "CAI", city: "Cairo", name: "Cairo International Airport", country: "EG" },
  { iata: "CMN", city: "Casablanca", name: "Mohammed V Airport", country: "MA" },
  { iata: "TUN", city: "Tunis", name: "Tunis-Carthage Airport", country: "TN" },
  { iata: "ALG", city: "Algiers", name: "Houari Boumediene Airport", country: "DZ" },
  { iata: "LAD", city: "Luanda", name: "Quatro de Fevereiro Airport", country: "AO" },
  { iata: "DAR", city: "Dar es Salaam", name: "Julius Nyerere Airport", country: "TZ" },
  { iata: "EBB", city: "Entebbe", name: "Entebbe International Airport", country: "UG" },
  { iata: "KGL", city: "Kigali", name: "Kigali International Airport", country: "RW" },
  { iata: "COO", city: "Cotonou", name: "Cadjehoun Airport", country: "BJ" },
  { iata: "LFW", city: "Lomé", name: "Gnassingbé Eyadéma Airport", country: "TG" },
  { iata: "BKO", city: "Bamako", name: "Modibo Keïta Airport", country: "ML" },
  { iata: "OUA", city: "Ouagadougou", name: "Thomas Sankara Airport", country: "BF" },
  { iata: "NDJ", city: "N'Djamena", name: "N'Djamena International Airport", country: "TD" },
  { iata: "BGF", city: "Bangui", name: "Bangui M'Poko Airport", country: "CF" },

  // Europe
  { iata: "CDG", city: "Paris", name: "Charles de Gaulle Airport", country: "FR" },
  { iata: "ORY", city: "Paris", name: "Orly Airport", country: "FR" },
  { iata: "LHR", city: "London", name: "Heathrow Airport", country: "GB" },
  { iata: "LGW", city: "London", name: "Gatwick Airport", country: "GB" },
  { iata: "AMS", city: "Amsterdam", name: "Schiphol Airport", country: "NL" },
  { iata: "FRA", city: "Frankfurt", name: "Frankfurt Airport", country: "DE" },
  { iata: "MUC", city: "Munich", name: "Munich Airport", country: "DE" },
  { iata: "MAD", city: "Madrid", name: "Adolfo Suárez Madrid–Barajas", country: "ES" },
  { iata: "BCN", city: "Barcelona", name: "Barcelona–El Prat Airport", country: "ES" },
  { iata: "FCO", city: "Rome", name: "Leonardo da Vinci Airport", country: "IT" },
  { iata: "MXP", city: "Milan", name: "Malpensa Airport", country: "IT" },
  { iata: "ZRH", city: "Zurich", name: "Zurich Airport", country: "CH" },
  { iata: "GVA", city: "Geneva", name: "Geneva Airport", country: "CH" },
  { iata: "BRU", city: "Brussels", name: "Brussels Airport", country: "BE" },
  { iata: "LIS", city: "Lisbon", name: "Humberto Delgado Airport", country: "PT" },
  { iata: "IST", city: "Istanbul", name: "Istanbul Airport", country: "TR" },
  { iata: "VIE", city: "Vienna", name: "Vienna International Airport", country: "AT" },
  { iata: "CPH", city: "Copenhagen", name: "Copenhagen Airport", country: "DK" },
  { iata: "OSL", city: "Oslo", name: "Oslo Airport", country: "NO" },
  { iata: "ARN", city: "Stockholm", name: "Stockholm Arlanda Airport", country: "SE" },
  { iata: "DUB", city: "Dublin", name: "Dublin Airport", country: "IE" },
  { iata: "WAW", city: "Warsaw", name: "Warsaw Chopin Airport", country: "PL" },
  { iata: "ATH", city: "Athens", name: "Athens International Airport", country: "GR" },
  { iata: "SVO", city: "Moscow", name: "Sheremetyevo Airport", country: "RU" },

  // Amériques
  { iata: "JFK", city: "New York", name: "John F. Kennedy Airport", country: "US" },
  { iata: "EWR", city: "Newark", name: "Newark Liberty Airport", country: "US" },
  { iata: "LAX", city: "Los Angeles", name: "Los Angeles International Airport", country: "US" },
  { iata: "ORD", city: "Chicago", name: "O'Hare International Airport", country: "US" },
  { iata: "MIA", city: "Miami", name: "Miami International Airport", country: "US" },
  { iata: "ATL", city: "Atlanta", name: "Hartsfield–Jackson Airport", country: "US" },
  { iata: "IAD", city: "Washington", name: "Dulles International Airport", country: "US" },
  { iata: "SFO", city: "San Francisco", name: "San Francisco International Airport", country: "US" },
  { iata: "YYZ", city: "Toronto", name: "Toronto Pearson Airport", country: "CA" },
  { iata: "YUL", city: "Montreal", name: "Montréal–Trudeau Airport", country: "CA" },
  { iata: "GRU", city: "São Paulo", name: "Guarulhos Airport", country: "BR" },
  { iata: "GIG", city: "Rio de Janeiro", name: "Galeão Airport", country: "BR" },
  { iata: "EZE", city: "Buenos Aires", name: "Ministro Pistarini Airport", country: "AR" },
  { iata: "BOG", city: "Bogotá", name: "El Dorado Airport", country: "CO" },
  { iata: "MEX", city: "Mexico City", name: "Benito Juárez Airport", country: "MX" },
  { iata: "LIM", city: "Lima", name: "Jorge Chávez Airport", country: "PE" },
  { iata: "SCL", city: "Santiago", name: "Arturo Merino Benítez Airport", country: "CL" },

  // Moyen-Orient / Asie
  { iata: "DXB", city: "Dubai", name: "Dubai International Airport", country: "AE" },
  { iata: "AUH", city: "Abu Dhabi", name: "Zayed International Airport", country: "AE" },
  { iata: "DOH", city: "Doha", name: "Hamad International Airport", country: "QA" },
  { iata: "JED", city: "Jeddah", name: "King Abdulaziz Airport", country: "SA" },
  { iata: "RUH", city: "Riyadh", name: "King Khalid Airport", country: "SA" },
  { iata: "BAH", city: "Manama", name: "Bahrain International Airport", country: "BH" },
  { iata: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Airport", country: "IN" },
  { iata: "DEL", city: "New Delhi", name: "Indira Gandhi Airport", country: "IN" },
  { iata: "SIN", city: "Singapore", name: "Changi Airport", country: "SG" },
  { iata: "BKK", city: "Bangkok", name: "Suvarnabhumi Airport", country: "TH" },
  { iata: "KUL", city: "Kuala Lumpur", name: "Kuala Lumpur International Airport", country: "MY" },
  { iata: "HKG", city: "Hong Kong", name: "Hong Kong International Airport", country: "HK" },
  { iata: "PVG", city: "Shanghai", name: "Shanghai Pudong Airport", country: "CN" },
  { iata: "PEK", city: "Beijing", name: "Beijing Capital Airport", country: "CN" },
  { iata: "NRT", city: "Tokyo", name: "Narita International Airport", country: "JP" },
  { iata: "HND", city: "Tokyo", name: "Haneda Airport", country: "JP" },
  { iata: "ICN", city: "Seoul", name: "Incheon International Airport", country: "KR" },
  { iata: "MNL", city: "Manila", name: "Ninoy Aquino Airport", country: "PH" },
  { iata: "CGK", city: "Jakarta", name: "Soekarno–Hatta Airport", country: "ID" },

  // Océanie
  { iata: "SYD", city: "Sydney", name: "Sydney Kingsford Smith Airport", country: "AU" },
  { iata: "MEL", city: "Melbourne", name: "Melbourne Airport", country: "AU" },
  { iata: "AKL", city: "Auckland", name: "Auckland Airport", country: "NZ" },
];

/** Recherche floue simple sur IATA / ville / nom / pays. */
export function searchAirportsLocal(query: string, limit = 8): AirportRecord[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const scored = AIRPORTS.map((airport) => {
    const iata = airport.iata.toLowerCase();
    const city = airport.city.toLowerCase();
    const name = airport.name.toLowerCase();
    let score = -1;
    if (iata === q) score = 100;
    else if (iata.startsWith(q)) score = 90;
    else if (city.startsWith(q)) score = 80;
    else if (city.includes(q)) score = 60;
    else if (name.includes(q)) score = 40;
    return { airport, score };
  })
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.airport);

  return scored;
}
