export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

/**
 * PATCH /api/admin/users/:id/referral-code
 *
 * Permet a un admin (permission users.manage) de modifier ou remplacer
 * le code de parrainage d'un membre ou d'un agent.
 *
 * Body: { code: "MONCODE" }  -> definit un code personnalise
 *       { generate: true }   -> genere un nouveau code aleatoire
 *
 * IMPORTANT : a l'inscription (voir /api/auth/signup) un code de parrainage
 * est resolu contre referralCode OU username OU id. Un code doit donc etre
 * unique face a ces trois champs, sinon l'attribution du filleul irait au
 * mauvais parrain.
 */

const CODE_MIN = 4;
const CODE_MAX = 20;
const CODE_PATTERN = /^[A-Z0-9_-]+$/;

/** Termes reserves : usurpation d'identite ou conflit avec des routes. */
const RESERVED = new Set([
  "ADMIN", "ADMINISTRATOR", "PIMPAY", "PIMOBIPAY", "SUPPORT",
  "SYSTEM", "ROOT", "NULL", "UNDEFINED", "ME", "API",
]);

/** Alphabet sans caracteres ambigus (0/O, 1/I/L). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/**
 * Verifie qu'aucun AUTRE compte ne repond deja a ce code
 * (referralCode, username ou id), afin de garantir une attribution fiable.
 */
async function findConflict(code: string, selfId: string) {
  return prisma.user.findFirst({
    where: {
      id: { not: selfId },
      OR: [
        { referralCode: { equals: code, mode: "insensitive" } },
        { username: { equals: code, mode: "insensitive" } },
        { id: code },
      ],
    },
    select: { id: true, username: true },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePermission(req, PERMISSIONS.USERS_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, username: true, email: true, referralCode: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const wantsGenerate = body?.generate === true;

    let code: string;

    if (wantsGenerate) {
      // Genere un code libre (quelques tentatives suffisent statistiquement)
      let candidate = "";
      for (let attempt = 0; attempt < 8; attempt++) {
        candidate = randomCode(8);
        if (!(await findConflict(candidate, target.id))) break;
        candidate = "";
      }
      if (!candidate) {
        return NextResponse.json(
          { error: "Impossible de generer un code libre, reessayez" },
          { status: 503 }
        );
      }
      code = candidate;
    } else {
      const raw = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
      if (!raw) {
        return NextResponse.json({ error: "Code requis" }, { status: 400 });
      }
      if (raw.length < CODE_MIN || raw.length > CODE_MAX) {
        return NextResponse.json(
          { error: `Le code doit contenir entre ${CODE_MIN} et ${CODE_MAX} caracteres` },
          { status: 400 }
        );
      }
      if (!CODE_PATTERN.test(raw)) {
        return NextResponse.json(
          { error: "Caracteres autorises : lettres, chiffres, tiret et underscore" },
          { status: 400 }
        );
      }
      if (RESERVED.has(raw)) {
        return NextResponse.json({ error: "Ce code est reserve" }, { status: 409 });
      }

      const conflict = await findConflict(raw, target.id);
      if (conflict) {
        return NextResponse.json(
          { error: "Ce code est deja utilise par un autre compte" },
          { status: 409 }
        );
      }
      code = raw;
    }

    const previous = target.referralCode;
    if (previous === code) {
      return NextResponse.json({ success: true, referralCode: code, unchanged: true });
    }

    let updated;
    try {
      updated = await prisma.user.update({
        where: { id: target.id },
        data: { referralCode: code },
        select: { id: true, referralCode: true },
      });
    } catch (err: any) {
      // Course entre la verification et l'ecriture (contrainte unique)
      if (err?.code === "P2002") {
        return NextResponse.json(
          { error: "Ce code vient d'etre pris, choisissez-en un autre" },
          { status: 409 }
        );
      }
      throw err;
    }

    // Journal d'audit + information de l'utilisateur (ses anciens liens ne marchent plus)
    const adminName = ctx.payload.name || ctx.payload.email || "Admin";
    await Promise.allSettled([
      prisma.auditLog.create({
        data: {
          adminId: ctx.payload.id,
          adminName,
          action: "UPDATE_REFERRAL_CODE",
          targetId: target.id,
          targetEmail: target.email,
          category: "users",
          targetType: "user",
          details: `Code de parrainage : ${previous || "(aucun)"} -> ${code}`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: target.id,
          title: "Code de parrainage modifie",
          message: `Votre code de parrainage est desormais ${code}. Vos anciens liens de parrainage ne sont plus valides, pensez a partager le nouveau.`,
          type: "WARNING",
          read: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      referralCode: updated.referralCode,
      previousCode: previous,
    });
  } catch (error: any) {
    console.error("ADMIN_UPDATE_REFERRAL_CODE_ERROR:", error?.message);
    if (error?.code === "P1001") {
      return NextResponse.json(
        { error: "Base de donnees en reveil (Neon). Reessayez." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
