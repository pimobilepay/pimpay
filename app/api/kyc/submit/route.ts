import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, KycStatus } from "@prisma/client";
import { generateKycTicket, buildUserDisplayName } from "@/lib/kyc-ticket";

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

// ---- VALIDATION ----

const REQUIRED_FIELDS: Record<string, string> = {
  idType: "Sélectionnez le type de document d'identité.",
  idCountry: "Sélectionnez le pays qui a délivré votre document.",
  idNumber: "Saisissez le numéro de votre document d'identité.",
  birthDate: "Saisissez votre date de naissance.",
  firstName: "Saisissez votre prénom.",
  lastName: "Saisissez votre nom.",
  nationality: "Sélectionnez votre nationalité.",
  gender: "Sélectionnez votre genre.",
  phone: "Saisissez votre numéro de téléphone.",
  address: "Saisissez votre adresse complète.",
  city: "Saisissez votre ville.",
  kycFrontUrl: "Ajoutez la photo du recto de votre document.",
  kycBackUrl: "Ajoutez la photo du verso de votre document.",
  kycSelfieUrl: "Prenez un selfie pour vérifier votre identité.",
};

function validateKycData(data: Record<string, unknown>) {
  for (const [field, message] of Object.entries(REQUIRED_FIELDS)) {
    if (typeof data[field] !== "string" || !data[field].trim()) return message;
  }

  if (data.idExpiryDate !== "PERMANENT" && typeof data.idExpiryDate !== "string") {
    return "Saisissez la date d'expiration du document ou sélectionnez « Document permanent ».";
  }

  if (data.idExpiryDate !== "PERMANENT" && Number.isNaN(Date.parse(data.idExpiryDate as string))) {
    return "La date d'expiration du document est invalide. Choisissez une date valide.";
  }

  if (Number.isNaN(Date.parse(data.birthDate as string))) {
    return "La date de naissance est invalide. Choisissez une date valide.";
  }

  const birthDate = new Date(data.birthDate as string);
  if (birthDate >= new Date()) return "La date de naissance doit être antérieure à aujourd'hui.";
  if (Date.now() - birthDate.getTime() < 18 * 365.25 * 24 * 60 * 60 * 1000) {
    return "Vous devez avoir au moins 18 ans pour soumettre un dossier KYC.";
  }

  return null;
}

// ---- MAIN API HANDLER ----

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, ...kycData } = data;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Votre session est expirée. Reconnectez-vous avant de soumettre le dossier." }, { status: 401 });
    }

    const validationError = validateKycData(kycData);
    if (validationError) {
      return NextResponse.json({ error: validationError, code: "KYC_VALIDATION_ERROR" }, { status: 422 });
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

      const fraudMessages: Record<string, string> = {
        DUPLICATE_ID_NUMBER: "Ce numéro de document est déjà associé à un autre compte.",
        DUPLICATE_PHONE: "Ce numéro de téléphone est déjà associé à un autre compte.",
        NAME_MISMATCH: "Le prénom ne correspond pas aux informations déjà enregistrées sur votre compte.",
        UNDERAGE: "Vous devez avoir au moins 18 ans pour utiliser ce service.",
        INVALID_AGE: "La date de naissance fournie semble invalide. Vérifiez-la avant de réessayer.",
        EXPIRED_DOCUMENT: "Votre document d'identité est expiré. Utilisez un document encore valide.",
        MISSING_SELFIE: "Le selfie est obligatoire pour vérifier votre identité.",
        MISSING_FRONT_ID: "La photo du recto de votre document est obligatoire.",
        MISSING_BACK_ID: "La photo du verso de votre document est obligatoire.",
        SHORT_ID_NUMBER: "Le numéro de document est trop court. Vérifiez le numéro saisi.",
      };
      const firstFraudMessage = fraudResult.flags.map(flag => fraudMessages[flag]).find(Boolean);
      return NextResponse.json({
        success: false,
        error: firstFraudMessage || "Votre dossier nécessite une vérification manuelle pour des raisons de sécurité.",
        code: "KYC_SECURITY_REVIEW",
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
        idExpiryDate: kycData.idExpiryDate === "PERMANENT" ? null : new Date(kycData.idExpiryDate),
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

    // Ticket unique cree a la soumission — sert de reference dans toutes
    // les notifications KYC (accuse de reception puis decision)
    const kycTicket = generateKycTicket();
    const displayName = buildUserDisplayName(updatedUser);

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: "Dossier KYC soumis",
        message: `Bonjour ${displayName}, votre dossier de verification d'identite a bien ete recu. Delai de traitement : 24-48h.`,
        type: "KYC_PENDING",
        metadata: {
          ticket: kycTicket,
          status: "PENDING",
          submittedAt: new Date().toISOString(),
          userName: displayName,
          userAvatar: updatedUser.avatar || undefined,
        },
      }
    });

    return NextResponse.json({
      success: true,
      status: updatedUser.kycStatus,
      ticket: kycTicket,
      fraudCheck: {
        score: fraudResult.score,
        riskLevel: fraudResult.riskLevel,
        flags: fraudResult.flags,
      }
    });

  } catch (error: any) {
    console.error("[v0] Erreur Submit KYC:", error);
    const message = error instanceof SyntaxError
      ? "Les données envoyées sont invalides. Rechargez la page et réessayez."
      : error?.code?.startsWith("P")
        ? "Impossible d'enregistrer votre dossier dans le compte. Vérifiez vos informations et réessayez."
        : "Le service de vérification est momentanément indisponible. Réessayez dans quelques instants.";
    return NextResponse.json(
      { error: message, code: "KYC_SUBMISSION_ERROR" },
      { status: 500 }
    );
  }
}
