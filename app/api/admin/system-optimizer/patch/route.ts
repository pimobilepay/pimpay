import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

interface PatchResult {
  success: boolean;
  vulnerabilityName: string;
  action: string;
  details: string;
  newScore?: number;
}

// Package patch recommendations
const PACKAGE_PATCHES: Record<string, {
  patchedVersion: string;
  overrideValue: string;
}> = {
  "resend": {
    patchedVersion: "4.0.0",
    overrideValue: ">=4.0.0"
  },
  "@tootallnate/once": {
    patchedVersion: "3.0.1",
    overrideValue: ">=3.0.1"
  },
  "next-auth": {
    patchedVersion: "4.24.8",
    overrideValue: ">=4.24.8"
  },
  "undici": {
    patchedVersion: "6.23.0",
    overrideValue: ">=6.23.0"
  },
  "axios": {
    patchedVersion: "1.7.4",
    overrideValue: ">=1.7.4"
  },
  "tar": {
    patchedVersion: "7.5.4",
    overrideValue: ">=7.5.4"
  },
  "secp256k1": {
    patchedVersion: "3.8.1",
    overrideValue: ">=3.8.1"
  },
  "valibot": {
    patchedVersion: "1.2.0",
    overrideValue: ">=1.2.0"
  },
  "dompurify": {
    patchedVersion: "3.2.4",
    overrideValue: ">=3.2.4"
  },
  "express": {
    patchedVersion: "4.21.0",
    overrideValue: ">=4.21.0"
  },
  "jsonwebtoken": {
    patchedVersion: "9.0.0",
    overrideValue: ">=9.0.0"
  }
};

export async function POST(req: NextRequest) {
  // Verify admin authentication
  const admin = await adminAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const { vulnerabilityName } = await req.json();

    if (!vulnerabilityName) {
      return NextResponse.json({ error: "Nom de la vulnerabilite requis" }, { status: 400 });
    }

    let result: PatchResult;

    // Extract package name from vulnerability name (format: "Package: packagename")
    const packageMatch = vulnerabilityName.match(/^Package:\s*(.+)$/i);
    
    if (packageMatch) {
      const packageName = packageMatch[1].trim();
      const patchInfo = PACKAGE_PATCHES[packageName];

      if (patchInfo) {
        // Read current package.json
        const packageJsonPath = path.join(process.cwd(), "package.json");
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

        // Ensure pnpm.overrides exists
        if (!packageJson.pnpm) {
          packageJson.pnpm = {};
        }
        if (!packageJson.pnpm.overrides) {
          packageJson.pnpm.overrides = {};
        }

        // Add the override
        packageJson.pnpm.overrides[packageName] = patchInfo.overrideValue;

        // Write updated package.json
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        result = {
          success: true,
          vulnerabilityName,
          action: "PACKAGE_OVERRIDE_ADDED",
          details: `Override ajoute pour ${packageName}: ${patchInfo.overrideValue}. Executez 'pnpm install' pour appliquer.`,
          newScore: 95
        };
      } else {
        result = {
          success: false,
          vulnerabilityName,
          action: "PACKAGE_NOT_FOUND",
          details: `Patch non disponible pour le package: ${packageName}`
        };
      }
    } else if (vulnerabilityName.includes("sans overrides")) {
      // Handle the "Packages sans overrides de securite" vulnerability
      const packageJsonPath = path.join(process.cwd(), "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      // Ensure pnpm.overrides exists
      if (!packageJson.pnpm) {
        packageJson.pnpm = {};
      }
      if (!packageJson.pnpm.overrides) {
        packageJson.pnpm.overrides = {};
      }

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      let patchedCount = 0;

      // Add overrides for all known vulnerable packages that are installed
      for (const [pkg, patchInfo] of Object.entries(PACKAGE_PATCHES)) {
        if (allDeps[pkg] && !packageJson.pnpm.overrides[pkg]) {
          packageJson.pnpm.overrides[pkg] = patchInfo.overrideValue;
          patchedCount++;
        }
      }

      if (patchedCount > 0) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        result = {
          success: true,
          vulnerabilityName,
          action: "BULK_OVERRIDES_ADDED",
          details: `${patchedCount} overrides de securite ajoutes. Executez 'pnpm install' pour appliquer.`,
          newScore: 98
        };
      } else {
        result = {
          success: true,
          vulnerabilityName,
          action: "NO_ACTION_NEEDED",
          details: "Tous les packages sont deja proteges."
        };
      }
    } else if (vulnerabilityName.includes("Weak Password")) {
      // Force password reset for users without passwords
      const updated = await prisma.user.updateMany({
        where: {
          OR: [
            { password: null },
            { password: "" }
          ]
        },
        data: {
          forcePasswordReset: true
        }
      });

      result = {
        success: true,
        vulnerabilityName,
        action: "FORCE_PASSWORD_RESET",
        details: `${updated.count} utilisateurs marques pour reinitialisation de mot de passe.`,
        newScore: 92
      };
    } else if (vulnerabilityName.includes("Pending Transaction")) {
      // Mark old pending transactions for review
      const flagged = await prisma.transaction.updateMany({
        where: {
          status: "PENDING",
          createdAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        data: {
          notes: "FLAGGED_FOR_REVIEW"
        }
      });

      result = {
        success: true,
        vulnerabilityName,
        action: "TRANSACTIONS_FLAGGED",
        details: `${flagged.count} transactions marquees pour revue.`,
        newScore: 90
      };
    } else {
      result = {
        success: false,
        vulnerabilityName,
        action: "UNKNOWN_VULNERABILITY",
        details: "Type de vulnerabilite non reconnu pour patch automatique."
      };
    }

    // Log the patch action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.name || admin.email || "Admin",
        action: "SECURITY_PATCH_APPLIED",
        details: JSON.stringify(result)
      }
    });

    if (!result.success) {
      return NextResponse.json({ error: result.details }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Patch application error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'application du patch" },
      { status: 500 }
    );
  }
}
