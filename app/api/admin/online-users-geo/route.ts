export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

// Country coordinates for map markers
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; flag: string }> = {
  "france": { lat: 46.6034, lng: 2.3522, flag: "🇫🇷" },
  "senegal": { lat: 14.4974, lng: -14.4524, flag: "🇸🇳" },
  "sénégal": { lat: 14.4974, lng: -14.4524, flag: "🇸🇳" },
  "cameroun": { lat: 5.9631, lng: 12.3547, flag: "🇨🇲" },
  "cameroon": { lat: 5.9631, lng: 12.3547, flag: "🇨🇲" },
  "cote d'ivoire": { lat: 7.5399, lng: -5.5471, flag: "🇨🇮" },
  "côte d'ivoire": { lat: 7.5399, lng: -5.5471, flag: "🇨🇮" },
  "ivory coast": { lat: 7.5399, lng: -5.5471, flag: "🇨🇮" },
  "mali": { lat: 17.5707, lng: -3.9962, flag: "🇲🇱" },
  "guinee": { lat: 10.7672, lng: -10.9408, flag: "🇬🇳" },
  "guinée": { lat: 10.7672, lng: -10.9408, flag: "🇬🇳" },
  "guinea": { lat: 10.7672, lng: -10.9408, flag: "🇬🇳" },
  "burkina faso": { lat: 12.2383, lng: -1.5616, flag: "🇧🇫" },
  "togo": { lat: 8.6195, lng: 1.1679, flag: "🇹🇬" },
  "benin": { lat: 9.3077, lng: 2.3158, flag: "🇧🇯" },
  "bénin": { lat: 9.3077, lng: 2.3158, flag: "🇧🇯" },
  "niger": { lat: 17.6078, lng: 9.0820, flag: "🇳🇪" },
  "congo": { lat: -0.2280, lng: 15.8277, flag: "🇨🇬" },
  "rdc": { lat: -4.0383, lng: 21.7587, flag: "🇨🇩" },
  "republique democratique du congo": { lat: -4.0383, lng: 21.7587, flag: "🇨🇩" },
  "democratic republic of the congo": { lat: -4.0383, lng: 21.7587, flag: "🇨🇩" },
  "dr congo": { lat: -4.0383, lng: 21.7587, flag: "🇨🇩" },
  "gabon": { lat: -0.8037, lng: 11.6094, flag: "🇬🇦" },
  "madagascar": { lat: -18.7669, lng: 46.8691, flag: "🇲🇬" },
  "maroc": { lat: 31.7917, lng: -7.0926, flag: "🇲🇦" },
  "morocco": { lat: 31.7917, lng: -7.0926, flag: "🇲🇦" },
  "tunisie": { lat: 33.8869, lng: 9.5375, flag: "🇹🇳" },
  "tunisia": { lat: 33.8869, lng: 9.5375, flag: "🇹🇳" },
  "algerie": { lat: 28.0339, lng: 1.6596, flag: "🇩🇿" },
  "algérie": { lat: 28.0339, lng: 1.6596, flag: "🇩🇿" },
  "algeria": { lat: 28.0339, lng: 1.6596, flag: "🇩🇿" },
  "usa": { lat: 37.0902, lng: -95.7129, flag: "🇺🇸" },
  "united states": { lat: 37.0902, lng: -95.7129, flag: "🇺🇸" },
  "etats-unis": { lat: 37.0902, lng: -95.7129, flag: "🇺🇸" },
  "canada": { lat: 56.1304, lng: -106.3468, flag: "🇨🇦" },
  "uk": { lat: 55.3781, lng: -3.4360, flag: "🇬🇧" },
  "united kingdom": { lat: 55.3781, lng: -3.4360, flag: "🇬🇧" },
  "royaume-uni": { lat: 55.3781, lng: -3.4360, flag: "🇬🇧" },
  "germany": { lat: 51.1657, lng: 10.4515, flag: "🇩🇪" },
  "allemagne": { lat: 51.1657, lng: 10.4515, flag: "🇩🇪" },
  "belgium": { lat: 50.5039, lng: 4.4699, flag: "🇧🇪" },
  "belgique": { lat: 50.5039, lng: 4.4699, flag: "🇧🇪" },
  "switzerland": { lat: 46.8182, lng: 8.2275, flag: "🇨🇭" },
  "suisse": { lat: 46.8182, lng: 8.2275, flag: "🇨🇭" },
  "nigeria": { lat: 9.0820, lng: 8.6753, flag: "🇳🇬" },
  "ghana": { lat: 7.9465, lng: -1.0232, flag: "🇬🇭" },
  "kenya": { lat: -0.0236, lng: 37.9062, flag: "🇰🇪" },
  "south africa": { lat: -30.5595, lng: 22.9375, flag: "🇿🇦" },
  "afrique du sud": { lat: -30.5595, lng: 22.9375, flag: "🇿🇦" },
  "spain": { lat: 40.4168, lng: -3.7038, flag: "🇪🇸" },
  "espagne": { lat: 40.4168, lng: -3.7038, flag: "🇪🇸" },
  "italy": { lat: 41.8719, lng: 12.5674, flag: "🇮🇹" },
  "italie": { lat: 41.8719, lng: 12.5674, flag: "🇮🇹" },
  "portugal": { lat: 39.3999, lng: -8.2245, flag: "🇵🇹" },
  "netherlands": { lat: 52.1326, lng: 5.2913, flag: "🇳🇱" },
  "pays-bas": { lat: 52.1326, lng: 5.2913, flag: "🇳🇱" },
  "rwanda": { lat: -1.9403, lng: 29.8739, flag: "🇷🇼" },
  "burundi": { lat: -3.3731, lng: 29.9189, flag: "🇧🇮" },
  "tchad": { lat: 15.4542, lng: 18.7322, flag: "🇹🇩" },
  "chad": { lat: 15.4542, lng: 18.7322, flag: "🇹🇩" },
  "mauritanie": { lat: 21.0079, lng: -10.9408, flag: "🇲🇷" },
  "mauritania": { lat: 21.0079, lng: -10.9408, flag: "🇲🇷" },
  "centrafrique": { lat: 6.6111, lng: 20.9394, flag: "🇨🇫" },
  "haiti": { lat: 18.9712, lng: -72.2852, flag: "🇭🇹" },
  "haïti": { lat: 18.9712, lng: -72.2852, flag: "🇭🇹" },
  "brazil": { lat: -14.2350, lng: -51.9253, flag: "🇧🇷" },
  "bresil": { lat: -14.2350, lng: -51.9253, flag: "🇧🇷" },
  "brésil": { lat: -14.2350, lng: -51.9253, flag: "🇧🇷" },
  "china": { lat: 35.8617, lng: 104.1954, flag: "🇨🇳" },
  "chine": { lat: 35.8617, lng: 104.1954, flag: "🇨🇳" },
  "india": { lat: 20.5937, lng: 78.9629, flag: "🇮🇳" },
  "inde": { lat: 20.5937, lng: 78.9629, flag: "🇮🇳" },
  "japan": { lat: 36.2048, lng: 138.2529, flag: "🇯🇵" },
  "japon": { lat: 36.2048, lng: 138.2529, flag: "🇯🇵" },
  "australia": { lat: -25.2744, lng: 133.7751, flag: "🇦🇺" },
  "australie": { lat: -25.2744, lng: 133.7751, flag: "🇦🇺" },
  "ethiopia": { lat: 9.1450, lng: 40.4897, flag: "🇪🇹" },
  "ethiopie": { lat: 9.1450, lng: 40.4897, flag: "🇪🇹" },
  "tanzania": { lat: -6.3690, lng: 34.8888, flag: "🇹🇿" },
  "tanzanie": { lat: -6.3690, lng: 34.8888, flag: "🇹🇿" },
  "uganda": { lat: 1.3733, lng: 32.2903, flag: "🇺🇬" },
  "ouganda": { lat: 1.3733, lng: 32.2903, flag: "🇺🇬" },
  "uae": { lat: 23.4241, lng: 53.8478, flag: "🇦🇪" },
  "united arab emirates": { lat: 23.4241, lng: 53.8478, flag: "🇦🇪" },
  "emirats arabes unis": { lat: 23.4241, lng: 53.8478, flag: "🇦🇪" },
  "saudi arabia": { lat: 23.8859, lng: 45.0792, flag: "🇸🇦" },
  "arabie saoudite": { lat: 23.8859, lng: 45.0792, flag: "🇸🇦" },
  "egypt": { lat: 26.8206, lng: 30.8025, flag: "🇪🇬" },
  "egypte": { lat: 26.8206, lng: 30.8025, flag: "🇪🇬" },
  "égypte": { lat: 26.8206, lng: 30.8025, flag: "🇪🇬" },
  "romania": { lat: 45.9432, lng: 24.9668, flag: "🇷🇴" },
  "roumanie": { lat: 45.9432, lng: 24.9668, flag: "🇷🇴" },
};

function normalizeCountry(country: string | null): string {
  if (!country) return "";
  return country
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getCountryGeo(country: string | null): { lat: number; lng: number; flag: string } | null {
  if (!country) return null;
  const norm = normalizeCountry(country);
  return COUNTRY_COORDINATES[norm] || null;
}

export async function GET(req: NextRequest) {
  try {
    const payload = await adminAuth(req);
    if (!payload) {
      return NextResponse.json(
        { error: "Acces refuse. Droits administrateur requis." },
        { status: 403 }
      );
    }

    // Get online users (active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const onlineActivities = await prisma.userActivity.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
      },
      distinct: ["userId"],
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true,
            country: true,
            role: true,
            status: true,
          },
        },
      },
    });

    // Build online users with geolocation
    const onlineUsersGeo = onlineActivities
      .filter(a => a.user)
      .map(activity => {
        const geo = getCountryGeo(activity.user.country);
        return {
          userId: activity.user.id,
          userName: activity.user.name || activity.user.username || "Utilisateur",
          userEmail: activity.user.email,
          userAvatar: activity.user.avatar,
          userRole: activity.user.role,
          userStatus: activity.user.status,
          country: activity.user.country,
          countryFlag: geo?.flag || null,
          latitude: geo?.lat || null,
          longitude: geo?.lng || null,
          currentPage: activity.page,
          device: activity.device,
          browser: activity.browser,
          os: activity.os,
          ip: activity.ip,
          lastSeen: activity.createdAt,
        };
      });

    return NextResponse.json({
      onlineUsers: onlineUsersGeo,
      totalOnline: onlineUsersGeo.length,
    });
  } catch (error) {
    console.error("[ONLINE_USERS_GEO_ERROR]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des utilisateurs" },
      { status: 500 }
    );
  }
}
