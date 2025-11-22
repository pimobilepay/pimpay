// lib/auth.ts
"use server";

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { serialize } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET in env");

// ------------------------------
// TYPES
// ------------------------------
export type UserRole = "admin" | "user";

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ------------------------------
// HASH PASSWORD
// ------------------------------
export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// ------------------------------
// COMPARE PASSWORD
// ------------------------------
export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// ------------------------------
// SIGN JWT (avec rôle)
// ------------------------------
export function signToken(payload: Omit<JwtPayload, "iat" | "exp">) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
}

// ------------------------------
// VERIFY TOKEN
// ------------------------------
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ------------------------------
// SET COOKIE
// ------------------------------
export function setTokenCookie(headers: Headers, token: string) {
  const cookie = serialize("pimpay_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  headers.append("Set-Cookie", cookie);
}
