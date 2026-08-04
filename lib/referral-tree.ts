/**
 * Construction de l'arbre de topologie des affilies (parrainage multi-niveaux).
 *
 * La hierarchie repose sur User.referredById :
 *  - downline (filleuls) : User[] where referredById = parent.id
 *  - upline (parrains)   : remontee successive de referredById
 *
 * Les requetes sont groupees par niveau (une requete par niveau) afin
 * d'eviter le N+1 sur les grands reseaux.
 */

import { prisma } from "@/lib/prisma";

export interface ReferralNode {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  country: string | null;
  status: string;
  role: string;
  kycVerified: boolean;
  referralCode: string | null;
  createdAt: string;
  /** Profondeur relative a la racine (racine = 0). */
  level: number;
  /** Nombre de filleuls directs (meme si non charges a cause de la limite). */
  directCount: number;
  children: ReferralNode[];
}

export interface ReferralLevelStat {
  level: number;
  count: number;
  verified: number;
}

export interface ReferralTopology {
  root: ReferralNode;
  /** Chaine des parrains, du plus proche au plus lointain. */
  upline: ReferralNode[];
  levels: ReferralLevelStat[];
  totalDescendants: number;
  verifiedDescendants: number;
  maxDepthReached: number;
  /** true si l'arbre a ete tronque par la limite de noeuds. */
  truncated: boolean;
}

const NODE_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  country: true,
  status: true,
  role: true,
  kycStatus: true,
  referralCode: true,
  referredById: true,
  createdAt: true,
} as const;

type RawUser = {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  country: string | null;
  status: string;
  role: string;
  kycStatus: string | null;
  referralCode: string | null;
  referredById: string | null;
  createdAt: Date;
};

function isVerified(kycStatus: string | null): boolean {
  return kycStatus === "VERIFIED" || kycStatus === "APPROVED";
}

function toNode(user: RawUser, level: number): ReferralNode {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    country: user.country,
    status: user.status,
    role: user.role,
    kycVerified: isVerified(user.kycStatus),
    referralCode: user.referralCode,
    createdAt: user.createdAt.toISOString(),
    level,
    directCount: 0,
    children: [],
  };
}

/**
 * Construit la topologie complete (upline + downline) d'un utilisateur.
 *
 * @param rootId    id de l'utilisateur racine
 * @param maxDepth  profondeur maximale de la descendance (defaut 4)
 * @param maxNodes  garde-fou sur le nombre total de descendants charges
 * @param uplineDepth nombre de generations de parrains a remonter
 */
export async function buildReferralTopology(
  rootId: string,
  {
    maxDepth = 4,
    maxNodes = 400,
    uplineDepth = 5,
  }: { maxDepth?: number; maxNodes?: number; uplineDepth?: number } = {}
): Promise<ReferralTopology | null> {
  const rootUser = (await prisma.user.findUnique({
    where: { id: rootId },
    select: NODE_SELECT,
  })) as RawUser | null;

  if (!rootUser) return null;

  const root = toNode(rootUser, 0);

  /* ── Downline : parcours par niveaux ───────────────────────── */
  const nodeIndex = new Map<string, ReferralNode>([[root.id, root]]);
  const levels: ReferralLevelStat[] = [];
  let frontier = [root.id];
  let totalDescendants = 0;
  let verifiedDescendants = 0;
  let truncated = false;
  let maxDepthReached = 0;

  for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
    const remaining = maxNodes - totalDescendants;
    if (remaining <= 0) {
      truncated = true;
      break;
    }

    const children = (await prisma.user.findMany({
      where: { referredById: { in: frontier } },
      select: NODE_SELECT,
      orderBy: { createdAt: "desc" },
      take: remaining + 1,
    })) as RawUser[];

    if (children.length === 0) break;

    if (children.length > remaining) {
      truncated = true;
      children.length = remaining;
    }

    let verifiedAtLevel = 0;
    const nextFrontier: string[] = [];

    for (const child of children) {
      const parent = child.referredById ? nodeIndex.get(child.referredById) : null;
      if (!parent) continue;
      const node = toNode(child, depth);
      parent.children.push(node);
      parent.directCount += 1;
      nodeIndex.set(node.id, node);
      nextFrontier.push(node.id);
      if (node.kycVerified) verifiedAtLevel += 1;
    }

    levels.push({ level: depth, count: children.length, verified: verifiedAtLevel });
    totalDescendants += children.length;
    verifiedDescendants += verifiedAtLevel;
    maxDepthReached = depth;
    frontier = nextFrontier;
  }

  /* ── Compte reel des filleuls directs des feuilles ──────────── */
  const leafIds = Array.from(nodeIndex.values())
    .filter((n) => n.children.length === 0)
    .map((n) => n.id);

  if (leafIds.length > 0) {
    const counts = await prisma.user.groupBy({
      by: ["referredById"],
      where: { referredById: { in: leafIds } },
      _count: { id: true },
    });
    for (const c of counts) {
      const node = c.referredById ? nodeIndex.get(c.referredById) : null;
      if (node) node.directCount = c._count.id;
    }
  }

  /* ── Upline : remontee de la chaine des parrains ────────────── */
  const upline: ReferralNode[] = [];
  const seen = new Set<string>([root.id]);
  let parentId = rootUser.referredById;

  for (let i = 0; i < uplineDepth && parentId && !seen.has(parentId); i++) {
    const parent = (await prisma.user.findUnique({
      where: { id: parentId },
      select: NODE_SELECT,
    })) as RawUser | null;
    if (!parent) break;
    seen.add(parent.id);
    upline.push(toNode(parent, -(i + 1)));
    parentId = parent.referredById;
  }

  return {
    root,
    upline,
    levels,
    totalDescendants,
    verifiedDescendants,
    maxDepthReached,
    truncated,
  };
}
