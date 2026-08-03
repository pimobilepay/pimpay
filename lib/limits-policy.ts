import { prisma } from "@/lib/prisma";

/**
 * MOTEUR DE PLAFONDS DYNAMIQUES
 * =============================
 *
 * Les plafonds de retrait / transfert / mpay ne sont plus codes en dur :
 * ils proviennent de la table `LimitPolicy`, pilotee depuis /admin/limits.
 *
 * L'admin peut creer une politique qui s'applique :
 *   - a TOUS les utilisateurs                   (scope = "ALL")
 *   - a un ou plusieurs ROLES                   (scope = "ROLES", roles = [...])
 *   - a une selection d'utilisateurs precis      (scope = "USERS", userIds = [...])
 *
 * Chaque politique peut cibler les comptes NON verifies, verifies ou les deux
 * (kycTier) et un ou plusieurs canaux (channels). Les champs laisses vides
 * heritent de la politique moins specifique, puis des valeurs par defaut
 * ci-dessous. Les politiques les plus specifiques gagnent :
 *
 *   valeurs par defaut  <  ALL  <  ROLES  <  USERS  (puis priority croissante)
 */

/* ─── Types ─────────────────────────────────────────────────────────────── */

export const LIMIT_CHANNELS = ["WITHDRAW", "TRANSFER", "MPAY", "WALLET"] as const;
export type LimitChannel = (typeof LIMIT_CHANNELS)[number];

export const LIMIT_SCOPES = ["ALL", "ROLES", "USERS"] as const;
export type LimitScope = (typeof LIMIT_SCOPES)[number];

export const LIMIT_KYC_TIERS = ["ALL", "NON_KYC", "KYC"] as const;
export type LimitKycTier = (typeof LIMIT_KYC_TIERS)[number];

export const LIMIT_ROLES = [
  "USER",
  "AGENT",
  "MERCHANT",
  "ADMIN",
  "BANK_ADMIN",
  "BUSINESS_ADMIN",
] as const;

export interface EffectiveLimits {
  /** Montant max (Pi) autorise sans KYC verifie. */
  kycFreeLimitPi: number;
  /** Plafond par transaction (Pi) pour un compte KYC verifie. */
  kycMaxPerTxPi: number;
  /** Au-dela de ce montant (Pi), validation admin obligatoire. */
  adminApprovalThresholdPi: number;
  /** Nombre max d'operations sortantes par jour. */
  maxPerDay: number;
  /** Volume cumule max par jour (Pi). null = illimite. */
  dailyTotalPi: number | null;
  /** Montant minimum par transaction (Pi). null = aucun minimum. */
  minPerTxPi: number | null;
  /** Exception admin : ignore l'obligation de KYC. */
  bypassKyc: boolean;
}

export interface AppliedPolicy {
  id: string;
  name: string;
  scope: LimitScope;
  kycTier: LimitKycTier;
  priority: number;
}

export interface ResolvedLimits extends EffectiveLimits {
  /** true si le compte est KYC verifie. */
  verified: boolean;
  /** Politiques admin appliquees (de la moins a la plus specifique). */
  applied: AppliedPolicy[];
  /** true si aucune politique admin n'a ete trouvee (valeurs par defaut). */
  usingDefaults: boolean;
}

/* ─── Valeurs par defaut (filet de securite) ────────────────────────────── */

export const DEFAULT_LIMITS: EffectiveLimits = {
  kycFreeLimitPi: 5,
  kycMaxPerTxPi: 100,
  adminApprovalThresholdPi: 50,
  maxPerDay: 10,
  dailyTotalPi: null,
  minPerTxPi: null,
  bypassKyc: false,
};

/** Un compte est considere verifie si son KYC est VERIFIED ou APPROVED. */
export function isKycVerifiedStatus(kycStatus?: string | null): boolean {
  return kycStatus === "VERIFIED" || kycStatus === "APPROVED";
}

/* ─── Cache memoire court (evite un SELECT par transaction) ─────────────── */

type PolicyRow = {
  id: string;
  name: string;
  scope: string;
  roles: string[];
  userIds: string[];
  kycTier: string;
  channels: string[];
  kycFreeLimitPi: number | null;
  kycMaxPerTxPi: number | null;
  adminApprovalThresholdPi: number | null;
  maxPerDay: number | null;
  dailyTotalPi: number | null;
  minPerTxPi: number | null;
  bypassKyc: boolean | null;
  priority: number;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

const CACHE_TTL_MS = 20_000;
let cache: { rows: PolicyRow[]; at: number } | null = null;

/** Invalide le cache (a appeler apres toute mutation admin). */
export function invalidateLimitPolicyCache() {
  cache = null;
}

async function loadPolicies(): Promise<PolicyRow[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;
  try {
    const client = prisma as any;
    if (!client?.limitPolicy) return [];
    const rows = (await client.limitPolicy.findMany({
      where: { active: true },
      orderBy: [{ priority: "asc" }, { updatedAt: "asc" }],
    })) as PolicyRow[];
    cache = { rows, at: Date.now() };
    return rows;
  } catch (err) {
    // Table absente (migration non appliquee) ou base indisponible :
    // on retombe silencieusement sur les valeurs par defaut.
    console.log("[v0] limit policies unavailable:", (err as Error)?.message);
    cache = { rows: [], at: Date.now() };
    return [];
  }
}

/* ─── Resolution ────────────────────────────────────────────────────────── */

function specificity(scope: string): number {
  if (scope === "USERS") return 3;
  if (scope === "ROLES") return 2;
  return 1;
}

function matches(
  p: PolicyRow,
  ctx: { userId?: string | null; role?: string | null; verified: boolean; channel?: LimitChannel }
): boolean {
  const now = new Date();
  if (!p.active) return false;
  if (p.startsAt && new Date(p.startsAt) > now) return false;
  if (p.endsAt && new Date(p.endsAt) < now) return false;

  // Canal
  if (p.channels?.length && ctx.channel && !p.channels.includes(ctx.channel)) return false;

  // Palier KYC
  if (p.kycTier === "KYC" && !ctx.verified) return false;
  if (p.kycTier === "NON_KYC" && ctx.verified) return false;

  // Portee
  if (p.scope === "USERS") {
    return Boolean(ctx.userId && p.userIds?.includes(ctx.userId));
  }
  if (p.scope === "ROLES") {
    return Boolean(ctx.role && p.roles?.includes(ctx.role));
  }
  return true; // ALL
}

function applyRow(base: EffectiveLimits, p: PolicyRow): EffectiveLimits {
  return {
    kycFreeLimitPi: p.kycFreeLimitPi ?? base.kycFreeLimitPi,
    kycMaxPerTxPi: p.kycMaxPerTxPi ?? base.kycMaxPerTxPi,
    adminApprovalThresholdPi: p.adminApprovalThresholdPi ?? base.adminApprovalThresholdPi,
    maxPerDay: p.maxPerDay ?? base.maxPerDay,
    dailyTotalPi: p.dailyTotalPi ?? base.dailyTotalPi,
    minPerTxPi: p.minPerTxPi ?? base.minPerTxPi,
    bypassKyc: p.bypassKyc ?? base.bypassKyc,
  };
}

/**
 * Calcule les plafonds effectifs d'un utilisateur.
 * Si `role` / `kycStatus` ne sont pas fournis, ils sont lus en base.
 */
export async function resolveUserLimits(params: {
  userId?: string | null;
  role?: string | null;
  kycStatus?: string | null;
  channel?: LimitChannel;
}): Promise<ResolvedLimits> {
  let { userId, role, kycStatus } = params;

  if (userId && (role === undefined || kycStatus === undefined)) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, kycStatus: true },
      });
      role = role ?? user?.role ?? null;
      kycStatus = kycStatus ?? user?.kycStatus ?? null;
    } catch {
      // ignore : on continue avec ce que l'on a
    }
  }

  const verified = isKycVerifiedStatus(kycStatus);
  const rows = await loadPolicies();

  const eligible = rows
    .filter((p) => matches(p, { userId, role, verified, channel: params.channel }))
    .sort((a, b) => {
      const s = specificity(a.scope) - specificity(b.scope);
      if (s !== 0) return s;
      return a.priority - b.priority;
    });

  let limits: EffectiveLimits = { ...DEFAULT_LIMITS };
  for (const p of eligible) limits = applyRow(limits, p);

  return {
    ...limits,
    verified,
    usingDefaults: eligible.length === 0,
    applied: eligible.map((p) => ({
      id: p.id,
      name: p.name,
      scope: p.scope as LimitScope,
      kycTier: p.kycTier as LimitKycTier,
      priority: p.priority,
    })),
  };
}

/**
 * Plafond effectif par transaction, tous critères confondus.
 * - compte verifie (ou exception bypassKyc) : kycMaxPerTxPi
 * - compte non verifie : kycFreeLimitPi
 */
export function maxPerTransaction(limits: EffectiveLimits & { verified?: boolean }): number {
  const verified = limits.verified || limits.bypassKyc;
  return verified ? limits.kycMaxPerTxPi : Math.min(limits.kycFreeLimitPi, limits.kycMaxPerTxPi);
}
