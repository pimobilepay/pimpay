/**
 * lib/savings-http.ts — Helpers HTTP partagés par les routes Épargne / Coffre-fort.
 *
 * Volontairement séparé de `lib/savings.ts` : ce dernier contient la couche
 * métier (mouvements atomiques, partie double) et ne doit pas dépendre de
 * Next.js. Ici on ne trouve que de la validation d'entrée et de la
 * normalisation de réponse.
 */

import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { SavingsError, toErrorResponse } from "@/lib/savings";
import { SUPPORTED_CURRENCIES } from "@/lib/validators";

/** Types de produits d'épargne acceptés (miroir de l'enum Prisma `SavingsType`). */
export const SAVINGS_TYPES = ["REGULAR", "FIXED_DEPOSIT", "RECURRING", "GOAL_BASED"] as const;
export type SavingsTypeValue = (typeof SAVINGS_TYPES)[number];

/** Durées autorisées pour un dépôt à terme, en mois. */
export const FIXED_TERMS_MONTHS = [3, 6, 12, 24, 36] as const;

/**
 * Identifie l'utilisateur courant ou lève une erreur 401.
 * Centralisé pour que toutes les routes renvoient le même contrat.
 */
export async function requireUserId(): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) throw new SavingsError("Authentification requise.", 401);
  return userId;
}

/** Corps JSON tolérant : un corps vide devient un objet vide. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Devise normalisée et validée contre la liste supportée par la plateforme. */
export function parseCurrency(raw: unknown, fallback = "XAF"): string {
  const value = String(raw ?? fallback).toUpperCase().trim();
  if (!SUPPORTED_CURRENCIES.includes(value as (typeof SUPPORTED_CURRENCIES)[number])) {
    throw new SavingsError(
      `Devise non supportée. Devises disponibles : ${SUPPORTED_CURRENCIES.join(", ")}.`
    );
  }
  return value;
}

/** Type de produit d'épargne validé. */
export function parseSavingsType(raw: unknown, fallback: SavingsTypeValue = "REGULAR"): SavingsTypeValue {
  const value = String(raw ?? fallback).toUpperCase().trim();
  if (!SAVINGS_TYPES.includes(value as SavingsTypeValue)) {
    throw new SavingsError(`Type d'épargne invalide. Valeurs acceptées : ${SAVINGS_TYPES.join(", ")}.`);
  }
  return value as SavingsTypeValue;
}

/** Libellé libre nettoyé, borné à 60 caractères. */
export function parseName(raw: unknown, fallback: string): string {
  const value = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!value) return fallback;
  if (value.length > 60) throw new SavingsError("Le nom ne peut dépasser 60 caractères.");
  return value;
}

/** Montant cible optionnel (objectif d'épargne). */
export function parseOptionalTarget(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new SavingsError("L'objectif doit être un montant positif.");
  }
  return Math.round(value * 100) / 100;
}

/** Clé d'idempotence fournie par le client, nettoyée. */
export function parseIdempotencyKey(raw: unknown): string | null {
  if (!raw) return null;
  const value = String(raw).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);
  return value || null;
}

/** Réponse d'erreur homogène pour toutes les routes de la fonctionnalité. */
export function savingsErrorResponse(error: unknown): NextResponse {
  const { error: message, status } = toErrorResponse(error);
  return NextResponse.json({ error: message }, { status });
}
