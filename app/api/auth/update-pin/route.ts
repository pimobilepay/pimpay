export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { UAParser } from "ua-parser-js";
import { z } from "zod";

// Zod schema for 6-digit PIN validation
const pinSchema = z.object({
  pin: z
    .string()
    .length(6, "Le PIN doit contenir exactement 6 chiffres")
    .regex(/^\d+$/, "Le PIN ne doit contenir que des chiffres"),
  userId: z.string().min(1, "ID utilisateur requis"),
  tempToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET || "";
    const body = await req.json();

    // Validate with Zod
    const validation = pinSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { pin, userId } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        username: true,
        pin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Hash the new PIN
    const salt = await bcrypt.genSalt(12);
    const hashedPin = await bcrypt.hash(pin, salt);

    // Update user with new 6-digit PIN and mark migration complete
    await prisma.user.update({
      where: { id: userId },
      data: {
        pin: hashedPin,
        pinVersion: 2,        // Marquer comme PIN 6 chiffres (version 2)
        pinUpdatedAt: new Date(),
      },
    });

    // Generate final JWT token for session
    const secretKey = new TextEncoder().encode(SECRET);
    const newToken = await new SignJWT({
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secretKey);

    // Parse user agent for session logging
    const userAgent = req.headers.get("user-agent") || "Appareil Inconnu";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const country = req.headers.get("x-vercel-ip-country") || "CG";
    const city = req.headers.get("x-vercel-ip-city") || "Brazzaville";

    const uaParser = new UAParser(userAgent);
    const uaDevice = uaParser.getDevice();
    const uaOS = uaParser.getOS();
    const uaBrowser = uaParser.getBrowser();

    const os =
      uaDevice.vendor && uaDevice.model
        ? `${uaDevice.vendor} ${uaDevice.model}`
        : uaOS.name
        ? `${uaOS.name}${uaOS.version ? ` ${uaOS.version}` : ""}`
        : userAgent.includes("Android")
        ? "Android"
        : userAgent.includes("iPhone")
        ? "iPhone"
        : "Desktop";
    const browser =
      uaBrowser.name ||
      (userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Safari") ? "Safari" : "Navigateur");

    try {
      // Update user last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ip,
        },
      });

      // Create session
      await prisma.session.create({
        data: {
          userId: user.id,
          token: newToken,
          isActive: true,
          userAgent,
          ip,
          deviceName: os,
          os: os,
          browser: browser,
          city: city,
          country: country,
        },
      });

      // Create notification for PIN migration
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "SECURITY",
          title: "PIN mis a jour",
          message: "Votre code PIN a ete migre vers 6 chiffres pour une securite renforcee",
          metadata: { ip, device: os, location: `${city}, ${country}`, action: "PIN_MIGRATION" },
        },
      });

      // Security log for PIN change
      await prisma.securityLog.create({
        data: {
          userId: user.id,
          action: "PIN_UPDATED_TO_6_DIGITS",
          ip: ip,
          device: os,
        },
      });
    } catch (dbError) {
      console.error("LOGGING_ERROR:", dbError);
      // Don't block the update if logging fails
    }

    // Determine redirect path based on role
    const getRedirectPath = (role: string) => {
      switch (role) {
        case "ADMIN":
          return "/admin";
        case "BANK_ADMIN":
          return "/bank";
        case "BUSINESS_ADMIN":
          return "/business";
        case "AGENT":
          return "/hub";
        default:
          return "/dashboard";
      }
    };

    const response = NextResponse.json({
      success: true,
      message: "Code PIN mis a jour avec succes",
      user: { id: user.id, role: user.role },
      redirectTo: getRedirectPath(user.role),
    });

    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ("none" as const) : ("lax" as const),
      path: "/",
      maxAge: 60 * 60 * 24,
    };

    response.cookies.set("token", newToken, cookieOptions);
    response.cookies.set("pimpay_token", newToken, cookieOptions);

    return response;
  } catch (error) {
    console.error("UPDATE_PIN_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
