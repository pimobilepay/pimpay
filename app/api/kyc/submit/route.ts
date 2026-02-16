import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, KycStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ---- FRAUD DETECTION ENGINE ----

interface FraudCheckResult {
  score: number;       // 0-100, higher = more suspicious
  flags: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  passed: boolean;
}

function computeFraudScore(data: Record<string, any>, ip: string, existingUsers: any[]): FraudCheckResult {
  let score = 0;
  const flags: string[] = [];

  // 1. Duplicate ID number check
  const duplicateId = existingUsers.find(
    u => u.idNumber === data.idNumber && u.id !== data.userId
  );
  if (duplicateId) {
    score += 40;
    flags.push("DUPLICATE_ID_NUMBER");
  }

  // 2. Duplicate phone check
  const duplicatePhone = existingUsers.find(
    u => u.phone === data.phone && u.id !== data.userId
  );
  if (duplicatePhone) {
    score += 25;
    flags.push("DUPLICATE_PHONE");
  }

  // 3. Name mismatch with existing profile
  const userProfile = existingUsers.find(u => u.id === data.userId);
  if (userProfile && userProfile.firstName && data.firstName) {
    if (userProfile.firstName.toLowerCase() !== data.firstName.toLowerCase()) {
      score += 15;
      flags.push("NAME_MISMATCH");
    }
  }

  // 4. Underage check (must be at least 18)
  if (data.birthDate) {
    const birth = new Date(data.birthDate);
    const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) {
      score += 50;
      flags.push("UNDERAGE");
    }
    if (age > 120) {
      score += 30;
      flags.push("INVALID_AGE");
    }
  }

  // 5. Expired document check
  if (data.idExpiryDate) {
    const expiry = new Date(data.idExpiryDate);
    if (expiry < new Date()) {
      score += 35;
      flags.push("EXPIRED_DOCUMENT");
    }
  }

  // 6. Missing critical documents
  if (!data.kycSelfieUrl) {
    score += 30;
    flags.push("MISSING_SELFIE");
  }
  if (!data.kycFrontUrl) {
    score += 20;
    flags.push("MISSING_FRONT_ID");
  }
  if (!data.kycBackUrl) {
    score += 15;
    flags.push("MISSING_BACK_ID");
  }

  // 7. Rapid resubmission check (< 5 min since last submission)
  if (userProfile?.kycSubmittedAt) {
    const lastSubmit = new Date(userProfile.kycSubmittedAt).getTime();
    const timeDiff = Date.now() - lastSubmit;
    if (timeDiff < 5 * 60 * 1000) {
      score += 20;
      flags.push("RAPID_RESUBMISSION");
    }
  }

  // 8. Short or suspicious ID number
  if (data.idNumber && data.idNumber.length < 5) {
    score += 15;
    flags.push("SHORT_ID_NUMBER");
  }

  // 9. Empty required fields
  const requiredFields = ['firstName', 'lastName', 'birthDate', 'nationality', 'idType', 'idNumber'];
  const missingCount = requiredFields.filter(f => !data[f] || data[f].trim?.() === '').length;
  if (missingCount > 0) {
    score += missingCount * 5;
    flags.push(`MISSING_FIELDS_${missingCount}`);
  }

  // Cap score at 100
  score = Math.min(score, 100);

  let riskLevel: FraudCheckResult["riskLevel"];
  if (score >= 70) riskLevel = "CRITICAL";
  else if (score >= 45) riskLevel = "HIGH";
  else if (score >= 20) riskLevel = "MEDIUM";
  else riskLevel = "LOW";

  return {
    score,
    flags,
    riskLevel,
    passed: score < 70, // CRITICAL blocks submission
  };
}

// ---- MAIN API HANDLER ----

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, ...kycData } = data;

    if (!userId) {
      return NextResponse.json({ error: "ID Utilisateur requis" }, { status: 401 });
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        kycStatus: true,
        kycSubmittedAt: true,
        idNumber: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Block if already verified
    if (user.kycStatus === "VERIFIED" || user.kycStatus === "APPROVED") {
      return NextResponse.json(
        { error: "KYC deja verifie", status: user.kycStatus },
        { status: 400 }
      );
    }

    // Get IP for fraud logging
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const device = request.headers.get("user-agent") || "unknown";

    // Fetch existing users for duplicate detection
    const existingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { idNumber: kycData.idNumber || undefined },
          { phone: kycData.phone || undefined },
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        idNumber: true,
        kycSubmittedAt: true,
      }
    });

    // Run fraud detection
    const fraudResult = computeFraudScore(
      { ...kycData, userId },
      ip,
      existingUsers
    );

    // Log fraud check result
    await prisma.securityLog.create({
      data: {
        userId,
        action: `KYC_FRAUD_CHECK`,
        ip,
        device: JSON.stringify({
          score: fraudResult.score,
          riskLevel: fraudResult.riskLevel,
          flags: fraudResult.flags,
          userAgent: device,
        }),
      }
    });

    // Block CRITICAL submissions
    if (!fraudResult.passed) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: KycStatus.REJECTED,
          kycReason: `Fraud detection: ${fraudResult.flags.join(', ')} (Score: ${fraudResult.score})`,
        }
      });

      await prisma.securityLog.create({
        data: {
          userId,
          action: "KYC_BLOCKED_FRAUD",
          ip,
          device: `Score: ${fraudResult.score}, Flags: ${fraudResult.flags.join(',')}`,
        }
      });

      return NextResponse.json({
        success: false,
        error: "Votre soumission a ete rejetee pour raison de securite",
        fraudScore: fraudResult.score,
        riskLevel: fraudResult.riskLevel,
      }, { status: 403 });
    }

    // Update user with KYC data
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: kycData.firstName,
        lastName: kycData.lastName,
        gender: kycData.gender,
        birthDate: kycData.birthDate ? new Date(kycData.birthDate) : null,
        nationality: kycData.nationality,
        idType: kycData.idType,
        idNumber: kycData.idNumber,
        idExpiryDate: kycData.idExpiryDate ? new Date(kycData.idExpiryDate) : null,
        idCountry: kycData.idCountry,
        occupation: kycData.occupation,
        phone: kycData.phone,
        address: kycData.address,
        city: kycData.city,
        provinceState: kycData.provinceState,
        kycFrontUrl: kycData.kycFrontUrl,
        kycBackUrl: kycData.kycBackUrl,
        kycSelfieUrl: kycData.kycSelfieUrl,
        kycStatus: KycStatus.PENDING,
        kycSubmittedAt: new Date(),
      },
    });

    // Security log for successful submission
    await prisma.securityLog.create({
      data: {
        userId,
        action: "KYC_SUBMITTED",
        ip,
        device,
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: "KYC Soumis",
        message: "Votre dossier KYC est en cours de verification. Delai: 24-48h.",
        type: "info",
      }
    });

    return NextResponse.json({
      success: true,
      status: updatedUser.kycStatus,
      fraudCheck: {
        score: fraudResult.score,
        riskLevel: fraudResult.riskLevel,
        flags: fraudResult.flags,
      }
    });

  } catch (error: any) {
    console.error("Erreur Submit KYC:", error);
    return NextResponse.json(
      { error: "Echec de l'enregistrement" },
      { status: 500 }
    );
  }
}
