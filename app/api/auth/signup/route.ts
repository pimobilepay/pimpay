export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";

// Simple email format validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { fullName, username, email, phone, password, confirmPassword, referralCode, role, businessInfo, country } = body;

    if (!fullName || !username || !email || !phone || !password) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    // Validate role (only USER or BUSINESS_ADMIN allowed from signup)
    const allowedRoles = ["USER", "BUSINESS_ADMIN"];
    const userRole = role && allowedRoles.includes(role) ? role : "USER";

    // If BUSINESS_ADMIN, validate business info
    if (userRole === "BUSINESS_ADMIN" && !businessInfo?.businessName) {
      return NextResponse.json({ error: "Informations de l'entreprise requises" }, { status: 400 });
    }

    // Simple email format validation (no external verification)
    if (!EMAIL_REGEX.test(email.toLowerCase())) {
      return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 });
    }

    // 1. VÉRIFICATION HORS TRANSACTION (Plus rapide)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
          { phone: phone }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email, Username ou Téléphone déjà utilisé" }, { status: 400 });
    }

    // 2. HASHACHE HORS TRANSACTION (C'est ce qui prend du temps !)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const hashedPin = await bcrypt.hash("000000", salt);

    // 3. TRANSACTION AVEC TIMEOUT AUGMENTÉ (20s)
    const result = await prisma.$transaction(async (tx) => {
      // Look up the referrer if a referral code is provided
      let referrerId: string | null = null;
      if (referralCode) {
        const referrer = await tx.user.findUnique({
          where: { referralCode },
          select: { id: true },
        });
        if (referrer) referrerId = referrer.id;
      }

      // Création de l'utilisateur
      const user = await tx.user.create({
        data: {
          name: fullName,
          username: username.toLowerCase(),
          email: email.toLowerCase(),
          phone: phone,
          password: hashedPassword,
          pin: hashedPin,
          role: userRole,
          status: "ACTIVE",
          kycStatus: "NONE",
          country: country || "CG",
          ...(referrerId ? { referredById: referrerId } : {}),
          wallets: {
            create: {
              balance: referrerId ? 0.25 : 0,
              currency: "PI",
              type: "PI",
            }
          }
        }
      });

      // If BUSINESS_ADMIN, create the business entity
      let business = null;
      if (userRole === "BUSINESS_ADMIN" && businessInfo) {
        // Generate a unique registration number if not provided
        const registrationNumber = businessInfo.rccm || `BUS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // Map business type to enum
        const businessTypeMap: { [key: string]: "SOLE_PROPRIETORSHIP" | "PARTNERSHIP" | "CORPORATION" | "LLC" | "COOPERATIVE" | "NGO" } = {
          "EI": "SOLE_PROPRIETORSHIP",
          "SARL": "LLC",
          "SA": "CORPORATION",
          "SAS": "CORPORATION",
          "ASSOCIATION": "NGO",
          "OTHER": "SOLE_PROPRIETORSHIP"
        };

        business = await tx.business.create({
          data: {
            name: businessInfo.businessName,
            registrationNumber: registrationNumber,
            type: businessTypeMap[businessInfo.businessType] || "SOLE_PROPRIETORSHIP",
            status: "PENDING_VERIFICATION",
            country: businessInfo.country || "CG",
            city: businessInfo.city,
            description: businessInfo.address,
            email: email.toLowerCase(),
            phone: phone,
          }
        });

        // Create the business employee record for the representative
        await tx.businessEmployee.create({
          data: {
            id: `BE-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            businessId: business.id,
            firstName: fullName.split(' ')[0] || fullName,
            lastName: fullName.split(' ').slice(1).join(' ') || '',
            position: businessInfo.representativePosition || "Representant Legal",
            isActive: true,
          }
        });

        // Create USD wallet for business
        await tx.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            currency: "USD",
            type: "FIAT",
          }
        });
      }

      // Grant referral bonus to referrer
      if (referrerId) {
        const referrerPiWallet = await tx.wallet.findFirst({
          where: { userId: referrerId, currency: "PI" },
        });
        if (referrerPiWallet) {
          await tx.wallet.update({
            where: { id: referrerPiWallet.id },
            data: { balance: { increment: 0.5 } },
          });
          await tx.transaction.create({
            data: {
              reference: `REF-BONUS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
              amount: 0.5,
              currency: "PI",
              type: "AIRDROP",
              status: "SUCCESS",
              description: `Bonus parrainage - Filleul: ${user.username}`,
              toUserId: referrerId,
              toWalletId: referrerPiWallet.id,
            },
          });
        }
      }

      // Génération du token
      const secretKey = new TextEncoder().encode(SECRET);
      const token = await new SignJWT({ id: user.id, role: user.role, username: user.username })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secretKey);

      // Création de la session
      await tx.session.create({
        data: {
          userId: user.id,
          token: token,
          isActive: true,
          ip: req.headers.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1",
          userAgent: req.headers.get("user-agent") || "Unknown",
        }
      });

      return { user, token };
    }, {
      maxWait: 10000, // Attendre 10s pour obtenir une connexion
      timeout: 20000  // Laisser 20s pour exécuter le tout
    });

    const response = NextResponse.json(
      {
        success: true,
        token: result.token,
        userId: result.user.id
      },
      { status: 201 }
    );

    response.cookies.set("pi_session_token", result.token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;

  } catch (error: any) {
    console.error("SIGNUP_ERROR:", error);
    return NextResponse.json(
      { error: "Le serveur est trop occupé, réessayez dans un instant." },
      { status: 500 }
    );
  }
}
