// lib/jwt.ts
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET env var");

export function signJwt(payload: Record<string, any>, opts: jwt.SignOptions = {}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d", ...opts });
}

export function verifyJwt<T = any>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}
