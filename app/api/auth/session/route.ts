import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = auth.replace("Bearer ", "");
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };

    // 1. Récupération des sessions de l'utilisateur
    const sessions = await prisma.session.findMany({
      where: { userId: payload.id },
      orderBy: { lastActiveAt: "desc" }, // Tri par activité la plus récente
    });

    // 2. Enrichissement dynamique pour le design FinTech & Carte
    const enrichedSessions = await Promise.all(
      sessions.map(async (s) => {
        let geo = {
          city: "Localisation...",
          country: "Inconnu",
          lat: 48.8566, // Paris par défaut
          lon: 2.3522
        };

        // Extraction des données de géo-localisation basées sur l'IP
        if (s.ip && s.ip !== "::1" && s.ip !== "127.0.0.1") {
          try {
            const res = await fetch(`http://ip-api.com/json/${s.ip}?fields=status,country,city,lat,lon`);
            const data = await res.json();
            if (data.status === "success") {
              geo = {
                city: data.city,
                country: data.country,
                lat: data.lat,
                lon: data.lon
              };
            }
          } catch (err) {
            console.error("Geo-IP fetch failed:", err);
          }
        }

        return {
          ...s,
          city: geo.city,
          country: geo.country,
          lat: geo.lat,
          lon: geo.lon,
          // Détermine si c'est la session actuelle de l'utilisateur
          isCurrent: token === s.token 
        };
      })
    );

    const active = enrichedSessions.filter(s => s.isActive);
    const history = enrichedSessions.filter(s => !s.isActive);

    return NextResponse.json({
      active,
      history,
    });
  } catch (e) {
    console.error("SESSION_ERROR:", e);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
