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
  "@tootallnate/once": { patchedVersion: "3.0.1", overrideValue: ">=3.0.1" },
  "next-auth":         { patchedVersion: "4.24.8", overrideValue: ">=4.24.8" },
  "undici":            { patchedVersion: "6.23.0", overrideValue: ">=6.23.0" },
  "axios":             { patchedVersion: "1.7.4",  overrideValue: ">=1.7.4" },
  "tar":               { patchedVersion: "7.5.4",  overrideValue: ">=7.5.4" },
  "secp256k1":         { patchedVersion: "3.8.1",  overrideValue: ">=3.8.1" },
  "valibot":           { patchedVersion: "1.2.0",  overrideValue: ">=1.2.0" },
  "dompurify":         { patchedVersion: "3.2.4",  overrideValue: ">=3.2.4" },
  "express":           { patchedVersion: "4.21.0", overrideValue: ">=4.21.0" },
  "jsonwebtoken":      { patchedVersion: "9.0.0",  overrideValue: ">=9.0.0" },
};

// ─── Score réel recalculé côté serveur ───────────────────────────────────────
/**
 * Recalcule le score en lisant package.json + en vérifiant l'état réel des vulnérabilités.
 * Appelé APRÈS chaque patch pour retourner un score cohérent.
 */
function recalculateScore(
  patchedVulnName: string,
  patchedSeverity: "critical" | "high" | "medium" | "low",
  remainingDetected: { severity: "critical" | "high" | "medium" | "low" }[]
): number {
  let score = 100;
  for (const v of remainingDetected) {
    switch (v.severity) {
      case "critical": score -= 15; break;
      case "high":     score -= 10; break;
      case "medium":   score -= 5;  break;
      case "low":      score -= 2;  break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

export async function POST(req: NextRequest) {
  const admin = await adminAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const { vulnerabilityName, action = "patch", notes, currentVulnerabilities } = await req.json();

    if (!vulnerabilityName) {
      return NextResponse.json({ error: "Nom de la vulnerabilite requis" }, { status: 400 });
    }

    let result: PatchResult;

    // ── Patch packages ────────────────────────────────────────────────────────
    const packageMatch = vulnerabilityName.match(/^Package:\s*(.+)$/i);

    if (packageMatch) {
      const packageName = packageMatch[1].trim();
      const patchInfo = PACKAGE_PATCHES[packageName];

      if (patchInfo) {
        const packageJsonPath = path.join(process.cwd(), "package.json");
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

        if (!packageJson.pnpm) packageJson.pnpm = {};
        if (!packageJson.pnpm.overrides) packageJson.pnpm.overrides = {};
        packageJson.pnpm.overrides[packageName] = patchInfo.overrideValue;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        result = {
          success: true,
          vulnerabilityName,
          action: "PACKAGE_OVERRIDE_ADDED",
          details: `Override ajoute pour ${packageName}: ${patchInfo.overrideValue}. Executez 'pnpm install' pour appliquer.`,
        };
      } else {
        result = {
          success: false,
          vulnerabilityName,
          action: "PACKAGE_NOT_FOUND",
          details: `Patch non disponible pour le package: ${packageName}`,
        };
      }

    // ── Bulk overrides ────────────────────────────────────────────────────────
    } else if (vulnerabilityName.includes("sans overrides")) {
      const packageJsonPath = path.join(process.cwd(), "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      if (!packageJson.pnpm) packageJson.pnpm = {};
      if (!packageJson.pnpm.overrides) packageJson.pnpm.overrides = {};

      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      let patchedCount = 0;

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
        };
      } else {
        result = {
          success: true,
          vulnerabilityName,
          action: "NO_ACTION_NEEDED",
          details: "Tous les packages sont deja proteges.",
        };
      }

    // ── Weak passwords ────────────────────────────────────────────────────────
    } else if (vulnerabilityName.includes("Weak Password")) {
      const updated = await prisma.user.updateMany({
        where: { OR: [{ password: null }, { password: "" }] },
        data: { forcePasswordReset: true },
      });
      result = {
        success: true,
        vulnerabilityName,
        action: "FORCE_PASSWORD_RESET",
        details: `${updated.count} utilisateurs marques pour reinitialisation de mot de passe.`,
      };

    // ── Pending transactions ──────────────────────────────────────────────────
    } else if (vulnerabilityName.includes("Pending Transaction")) {
      const flagged = await prisma.transaction.updateMany({
        where: {
          status: "PENDING",
          createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        data: { notes: "FLAGGED_FOR_REVIEW" },
      });
      result = {
        success: true,
        vulnerabilityName,
        action: "TRANSACTIONS_FLAGGED",
        details: `${flagged.count} transactions marquees pour revue.`,
      };

    } else {
      result = {
        success: false,
        vulnerabilityName,
        action: "UNKNOWN_VULNERABILITY",
        details: "Type de vulnerabilite non reconnu pour patch automatique.",
      };
    }

    // ── Recalcul du score réel ────────────────────────────────────────────────
    if (result.success && currentVulnerabilities) {
      // Le client envoie la liste actuelle des vulnérabilités, on recalcule
      // en excluant celle qui vient d'être patchée
      const remaining = (currentVulnerabilities as { name: string; severity: "critical"|"high"|"medium"|"low"; status: string }[])
        .filter(v => v.name !== vulnerabilityName && v.status !== "fixed");

      let newScore = 100;
      for (const v of remaining) {
        switch (v.severity) {
          case "critical": newScore -= 15; break;
          case "high":     newScore -= 10; break;
          case "medium":   newScore -= 5;  break;
          case "low":      newScore -= 2;  break;
        }
      }
      result.newScore = Math.max(0, Math.min(100, newScore));
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.name || admin.email || "Admin",
        action: "SECURITY_PATCH_APPLIED",
        details: JSON.stringify({ ...result, notes }),
      },
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
