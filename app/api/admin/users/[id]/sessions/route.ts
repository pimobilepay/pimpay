export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = auth.split(" ")[1];
    const payload: any = jwt.verify(token, JWT_SECRET);

    // Vérification stricte du rôle ADMIN
    const admin = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = params.id;

    // Récupération de toutes les sessions de l'utilisateur cible
    const sessions = await prisma.session.findMany({
      where: { userId: userId },
      orderBy: { lastActiveAt: "desc" },
    });

    // Enrichissement avec les données de localisation (Optionnel mais recommandé)
    const enrichedSessions = await Promise.all(
      sessions.map(async (s) => {
        let city = "Inconnu";
        if (s.ip && s.ip !== "::1" && s.ip !== "127.0.0.1") {
          try {
            const geoRes = await fetch(`http://ip-api.com/json/${s.ip}?fields=city`);
            const geo = await geoRes.json();
            city = geo.city || "Inconnu";
          } catch (e) {
            console.error("Geo fetch failed for admin view");
          }
        }
        return { ...s, city };
      })
    );

    return NextResponse.json({ sessions: enrichedSessions });
  } catch (error) {
    console.error("ADMIN_GET_SESSIONS_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
