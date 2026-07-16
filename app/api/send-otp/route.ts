export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import Twilio from "twilio";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/send-otp
 *
 * [FIX] Faille critique corrigée : cette route n'avait AUCUNE authentification
 * et envoyait par SMS (via Twilio, donc à tes frais) exactement le `code`
 * fourni par l'appelant, vers le `phone` de son choix — un relais SMS ouvert
 * vers n'importe quel numéro au monde (risque de "SMS pumping fraud").
 *
 * Corrections :
 *   1) Authentification obligatoire (session).
 *   2) Le code n'est plus fourni par le client : il est généré côté serveur
 *      (6 chiffres aléatoires cryptographiquement sûrs) et stocké dans
 *      `Otp` avec expiration — même modèle que /api/auth/send/recovery/otp.
 *   3) Rate limiting par utilisateur ET par numéro de téléphone.
 */
export async function POST(req: Request) {
  try {
    const session = await auth() as { id?: string } | null;
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { phone } = await req.json();
    if (!phone || typeof phone !== "string" || !/^\+?[1-9]\d{6,14}$/.test(phone)) {
      return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
    }

    // Rate limit : 3 SMS / 10 min par utilisateur, et par numéro ciblé
    // (empêche à la fois le spam sortant depuis un compte et le SMS-bombing
    // d'un numéro précis via plusieurs comptes).
    const ip = getClientIp(req as any);
    const rlUser = checkRateLimit(`send-otp:user:${session.id}`, 3, 10 * 60_000);
    const rlPhone = checkRateLimit(`send-otp:phone:${phone}`, 3, 10 * 60_000);
    const rlIp = checkRateLimit(`send-otp:ip:${ip}`, 10, 10 * 60_000);
    if (rlUser.limited || rlPhone.limited || rlIp.limited) {
      return NextResponse.json({ error: "Trop de demandes, réessayez plus tard." }, { status: 429 });
    }

    // Code généré côté serveur — jamais confié au client
    const otpCode = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otp.create({
      data: {
        identifier: phone,
        code: otpCode,
        type: "PHONE_VERIFICATION",
        expiresAt,
      },
    });

    const client = Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: `Code PIMOBIPAY : ${otpCode}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // [FIX V9] Ne pas exposer error.message en production
    console.error("Twilio error:", error);
    return NextResponse.json({ success: false, error: "Erreur lors de l'envoi du code" });
  }
}
