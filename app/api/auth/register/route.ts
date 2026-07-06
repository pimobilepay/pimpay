/**
 * app/api/auth/register/route.ts - SECURE VERSION
 * [FIX V30] Input validation + secure registration
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken, signRefreshToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";
import {
  validateEmail,
  validateUsername,
  validatePasswordStrength,
  sanitizeString,
} from "@/lib/inputValidation";
import { checkDistributedRateLimit, RATE_LIMITS } from "@/lib/distributedRateLimit";
import { getClientIp } from "@/lib/rate-limit";
import { logAuthEvent } from "@/lib/secureLogger";
import { validateCsrfMiddleware } from "@/lib/csrf";

export async function POST(req: Request) {
  try {
    // [FIX V25] CSRF validation
    if (!validateCsrfMiddleware(req)) {
      return NextResponse.json(
        { error: "CSRF token invalide" },
        { status: 403 }
      );
    }

    // Rate limiting
    const ip = getClientIp(req);
    const rl = await checkDistributedRateLimit(
      `register:${ip}`,
      5, // 5 registrations per IP per minute
      60
    );

    if (rl.limited) {
      return NextResponse.json(
        { error: "Trop de tentatives d'inscription. Veuillez patienter." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email, username, password, confirmPassword } = body;

    // [FIX V30] Input validation
    if (!email || !username || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Format email invalide" },
        { status: 400 }
      );
    }

    // Validate username format
    if (!validateUsername(username)) {
      return NextResponse.json(
        { error: "Username invalide (3-20 caractères, alphanumériques uniquement)" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValid = validatePasswordStrength(password);
    if (!passwordValid.valid) {
      return NextResponse.json(
        { error: "Mot de passe faible", details: passwordValid.errors },
        { status: 400 }
      );
    }

    // Password confirmation
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Les mots de passe ne correspondent pas" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "Ce username est déjà utilisé" },
        { status: 409 }
      );
    }

    // Hash password with bcrypt (12 rounds)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
        status: "ACTIVE",
        kycStatus: "NONE",
      },
    });

    // Create default wallets
    await prisma.wallet.createMany({
      data: [
        { userId: user.id, currency: "PI", type: "PI" },
        { userId: user.id, currency: "XAF", type: "FIAT" },
        { userId: user.id, currency: "USD", type: "FIAT" },
        { userId: user.id, currency: "SDA", type: "CRYPTO" },
      ],
    });

    // Generate tokens
    const token = await signSessionToken(
      { id: user.id, role: user.role, email: user.email, username: user.username },
      "15m"
    );

    const refreshToken = await signRefreshToken({
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
    });

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        isActive: true,
        ip,
        userAgent: req.headers.get("user-agent") || "Unknown",
      },
    }).catch(() => {});

    // Log registration
    await logAuthEvent(
      'LOGIN',
      user.id,
      user.email,
      ip,
      req.headers.get("user-agent") || "Unknown",
      'SUCCESS'
    );

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username },
      message: "Inscription réussie",
    });

    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });

    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/api/auth/refresh",
      maxAge: 604800,
    });

    return response;

  } catch (error: any) {
    console.error("REGISTER_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
