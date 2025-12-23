import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export function adminAuth(req: NextRequest) {
  // 1. Tenter de récupérer le token depuis le Header Authorization (Bearer)
  let token = req.headers.get("authorization")?.split(" ")[1];

  // 2. SI pas de header, tenter de récupérer le token depuis les COOKIES
  // (C'est ce qui manque pour que ton Dashboard fonctionne)
  if (!token) {
    token = req.cookies.get("token")?.value; // Remplace "token" par le nom exact de ton cookie si différent
  }

  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 401 });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if ((payload as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    return payload;
  } catch (err) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }
}
