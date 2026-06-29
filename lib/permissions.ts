import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, type TokenPayload } from "@/lib/adminAuth";

/**
 * RBAC granulaire pour le portail admin.
 *
 * Modèle :
 *  - Un User role=ADMIN SANS AdminProfile => SUPER-ADMIN (accès total),
 *    pour rétro-compatibilité avec les comptes admin existants.
 *  - Un AdminProfile.isSuperAdmin => accès total.
 *  - Sinon, l'accès dépend du tableau `permissions` (liste de PermissionKey).
 */

export const PERMISSIONS = {
  // Catégories fonctionnelles fines
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  TRANSACTIONS_VIEW: "transactions.view",
  TRANSACTIONS_MANAGE: "transactions.manage",
  KYC_REVIEW: "kyc.review",
  TREASURY_VIEW: "treasury.view",
  TREASURY_MANAGE: "treasury.manage",
  AML_VIEW: "aml.view",
  AML_MANAGE: "aml.manage",
  RESERVES_VIEW: "reserves.view",
  RESERVES_MANAGE: "reserves.manage",
  LEDGER_VIEW: "ledger.view",
  LEDGER_MANAGE: "ledger.manage",
  WITHDRAWALS_VIEW: "withdrawals.view",
  WITHDRAWALS_MANAGE: "withdrawals.manage",
  DISPUTES_VIEW: "disputes.view",
  DISPUTES_MANAGE: "disputes.manage",
  EXCHANGE_VIEW: "exchange.view",
  EXCHANGE_MANAGE: "exchange.manage",
  REFERRAL_VIEW: "referral.view",
  REFERRAL_MANAGE: "referral.manage",
  RBAC_VIEW: "rbac.view",
  RBAC_MANAGE: "rbac.manage",
  SETTINGS_MANAGE: "settings.manage",
  SECURITY_VIEW: "security.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

// Libellés FR pour l'UI
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "users.view": "Voir les utilisateurs",
  "users.manage": "Gérer les utilisateurs",
  "transactions.view": "Voir les transactions",
  "transactions.manage": "Gérer les transactions",
  "kyc.review": "Vérifier les KYC",
  "treasury.view": "Voir la trésorerie",
  "treasury.manage": "Gérer la trésorerie",
  "aml.view": "Voir l'AML / anti-fraude",
  "aml.manage": "Gérer l'AML / anti-fraude",
  "reserves.view": "Voir la preuve de réserves",
  "reserves.manage": "Gérer la preuve de réserves",
  "ledger.view": "Voir le grand livre",
  "ledger.manage": "Gérer le grand livre",
  "withdrawals.view": "Voir les whitelists de retrait",
  "withdrawals.manage": "Gérer les whitelists / cold wallets",
  "disputes.view": "Voir les litiges",
  "disputes.manage": "Gérer les litiges / chargebacks",
  "exchange.view": "Voir les taux de change",
  "exchange.manage": "Gérer les taux & liquidité",
  "referral.view": "Voir le parrainage",
  "referral.manage": "Gérer le parrainage",
  "rbac.view": "Voir les rôles & permissions",
  "rbac.manage": "Gérer les rôles & permissions",
  "settings.manage": "Gérer la configuration",
  "security.view": "Voir la sécurité",
};

// Rôles prédéfinis (presets) appliqués via l'UI RBAC.
export const ROLE_PRESETS: Record<string, { label: string; permissions: PermissionKey[] }> = {
  SUPER_ADMIN: { label: "Super Admin", permissions: ALL_PERMISSIONS },
  COMPLIANCE: {
    label: "Conformité / AML",
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.TRANSACTIONS_VIEW,
      PERMISSIONS.KYC_REVIEW,
      PERMISSIONS.AML_VIEW,
      PERMISSIONS.AML_MANAGE,
      PERMISSIONS.DISPUTES_VIEW,
      PERMISSIONS.DISPUTES_MANAGE,
      PERMISSIONS.SECURITY_VIEW,
    ],
  },
  FINANCE: {
    label: "Finance / Trésorerie",
    permissions: [
      PERMISSIONS.TREASURY_VIEW,
      PERMISSIONS.TREASURY_MANAGE,
      PERMISSIONS.RESERVES_VIEW,
      PERMISSIONS.RESERVES_MANAGE,
      PERMISSIONS.LEDGER_VIEW,
      PERMISSIONS.LEDGER_MANAGE,
      PERMISSIONS.EXCHANGE_VIEW,
      PERMISSIONS.EXCHANGE_MANAGE,
      PERMISSIONS.WITHDRAWALS_VIEW,
      PERMISSIONS.WITHDRAWALS_MANAGE,
    ],
  },
  SUPPORT: {
    label: "Support N2",
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.TRANSACTIONS_VIEW,
      PERMISSIONS.DISPUTES_VIEW,
      PERMISSIONS.DISPUTES_MANAGE,
      PERMISSIONS.REFERRAL_VIEW,
    ],
  },
  ANALYST: {
    label: "Analyste (lecture seule)",
    permissions: ALL_PERMISSIONS.filter((p) => p.endsWith(".view")),
  },
};

export interface AdminContext {
  payload: TokenPayload;
  isSuperAdmin: boolean;
  permissions: PermissionKey[];
  profileActive: boolean;
}

/**
 * Récupère le contexte RBAC complet d'un admin authentifié.
 * Retourne null si l'utilisateur n'est pas ADMIN.
 */
export async function getAdminContext(req: NextRequest): Promise<AdminContext | null> {
  const payload = await verifyAuth(req);
  if (!payload || payload.role !== "ADMIN") return null;

  const profile = await prisma.adminProfile.findUnique({
    where: { userId: payload.id },
    select: { isSuperAdmin: true, permissions: true, active: true },
  });

  // Pas de profil => super-admin historique
  if (!profile) {
    return { payload, isSuperAdmin: true, permissions: ALL_PERMISSIONS, profileActive: true };
  }

  if (!profile.active) {
    return { payload, isSuperAdmin: false, permissions: [], profileActive: false };
  }

  if (profile.isSuperAdmin) {
    return { payload, isSuperAdmin: true, permissions: ALL_PERMISSIONS, profileActive: true };
  }

  return {
    payload,
    isSuperAdmin: false,
    permissions: (profile.permissions as PermissionKey[]) || [],
    profileActive: true,
  };
}

export function ctxHasPermission(ctx: AdminContext | null, permission: PermissionKey): boolean {
  if (!ctx || !ctx.profileActive) return false;
  if (ctx.isSuperAdmin) return true;
  return ctx.permissions.includes(permission);
}

/**
 * Garde de route : exige une permission précise.
 * Retourne le contexte si autorisé, sinon une NextResponse d'erreur.
 */
export async function requirePermission(
  req: NextRequest,
  permission: PermissionKey
): Promise<AdminContext | NextResponse> {
  const ctx = await getAdminContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
  }
  if (!ctxHasPermission(ctx, permission)) {
    return NextResponse.json(
      { error: "Permission insuffisante", required: permission },
      { status: 403 }
    );
  }
  return ctx;
}
