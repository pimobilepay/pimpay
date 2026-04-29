import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";

export interface TokenPayload {
  id: string;
  role: string;
  email?: string;
  name?: string;
  username?: string;
}

/**
 * verifyAuth - Vérifie JWT uniquement (pas de pi_session_token non signé)
 */
export async function verifyAuth(req: NextRequest): Promise<TokenPayload | null> {
  try {
    let token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      token = req.cookies.get("token")?.value || req.cookies.get("pimpay_token")?.value;
    }
    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.id, status: "ACTIVE" },
      select: { id: true, role: true, email: true, name: true, username: true }
    });
    if (!user) return null;

    return {
      id: user.id,
      role: user.role,
      email: user.email || undefined,
      name: user.name || undefined,
      username: user.username || undefined,
    };
  } catch (err) {
    console.error("[VERIFY_AUTH_ERROR]:", err);
    return null;
  }
}

/**
 * adminAuth - Vérifie strictement le rôle ADMIN
 */
export async function adminAuth(req: NextRequest): Promise<TokenPayload | null> {
  const payload = await verifyAuth(req);
  if (!payload || payload.role !== "ADMIN") return null;
  return payload;
}
