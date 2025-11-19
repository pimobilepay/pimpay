// lib/auth.ts
import jwt from "jsonwebtoken";
// lib/auth.ts
import bcrypt from "bcryptjs";
import { serialize } from "cookie";

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function setTokenCookie(resHeaders: Headers | any, token: string) {
  // If using Next.js route handlers, you return a Response and set headers.
  // We produce a Set-Cookie header string.
  const cookie = serialize("pimpay_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  // If using Next.js route response, set header "Set-Cookie"
  resHeaders.append ? resHeaders.append("Set-Cookie", cookie) : resHeaders["Set-Cookie"] = cookie;
}


const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET env var");

export function signToken(payload: object, opts?: jwt.SignOptions) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d", ...(opts ?? {}) });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
