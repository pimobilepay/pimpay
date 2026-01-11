export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { UAParser } from "ua-parser-js";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return new TextEncoder().encode(secret);
};

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    // Vérification du token avec jose (comme dans ton lib/auth.ts)
    const secret = getJwtSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    // 1. Récupération des sessions de l'utilisateur
    const sessions = await prisma.session.findMany({
      where: { userId: userId },
      orderBy: { lastActiveAt: "desc" },
    });

    // 2. Traitement enrichi des sessions
    const enrichedSessions = await Promise.all(
      sessions.map(async (s) => {
        const parser = new UAParser(s.userAgent || "");
        const device = parser.getDevice();
        const os = parser.getOS();
        const browser = parser.getBrowser();

        // Nom d'affichage intelligent
        const deviceDisplayName = s.deviceName || (device.model
          ? `${device.vendor} ${device.model}`
          : `${browser.name} sur ${os.name}`);

        // Préparation des données géo (priorité à la DB, puis fallback IP-API)
        let city = s.city;
        let country = s.country;
        let lat = s.lat;
        let lon = s.lon;

        // Si les données géo sont manquantes et qu'on a une IP valide
        if (!city && s.ip && s.ip !== "::1" && s.ip !== "127.0.0.1") {
          try {
            const res = await fetch(`http://ip-api.com/json/${s.ip}?fields=status,country,city,lat,lon`);
            const data = await res.json();
            if (data.status === "success") {
              city = data.city;
              country = data.country;
              lat = data.lat;
              lon = data.lon;

              // Mise à jour silencieuse de la DB pour les prochaines fois
              await prisma.session.update({
                where: { id: s.id },
                data: { city, country, lat, lon }
              });
            }
          } catch (err) {
            console.error("Geo-IP Error:", err);
          }
        }

        return {
          id: s.id,
          ip: s.ip,
          deviceName: deviceDisplayName,
          os: s.os || `${os.name} ${os.version || ""}`,
          browser: s.browser || browser.name,
          city: city || "Congo",
          country: country || "Localisation...",
          lat: lat || 0,
          lon: lon || 0,
          lastActiveAt: s.lastActiveAt,
          isActive: s.isActive,
          // Vérification si c'est la session actuelle
          isCurrent: token === s.token
        };
      })
    );

    return NextResponse.json({
      active: enrichedSessions.filter(s => s.isActive),
      history: enrichedSessions.filter(s => !s.isActive),
    });

  } catch (e) {
    console.error("SESSION_API_ERROR:", e);
    return NextResponse.json({ error: "Session expirée ou invalide" }, { status: 401 });
  }
}
