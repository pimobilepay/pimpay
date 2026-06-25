/**
 * lib/amount-guard.ts — Validation stricte des montants (Business Logic Validation).
 *
 * Bloque mathématiquement, AVANT toute écriture en base ou action on-chain :
 *   - les valeurs non numériques (string, null, objets, NaN, Infinity) ;
 *   - les montants négatifs ou nuls ;
 *   - les overflows (montants aberrants type millions/milliards d'unités) ;
 *   - la manipulation des décimales (le token natif utilise un format à 8 décimales).
 *
 * Toute la plateforme DOIT passer par `parseAmount` plutôt que par `parseFloat`
 * brut, qui accepte "1e30", " 12 ", "0x10", etc.
 */

/** Décimales autorisées pour le token natif (format standard type Stellar/Pi : 7-8 déc.). */
export const TOKEN_DECIMALS = 8;

/**
 * Plafond absolu par opération. Au-delà, c'est forcément une injection
 * (la logique métier d'une banque virtuelle n'autorise pas de tels montants).
 * Ajustez selon vos règles AML, mais gardez une borne FINIE bien en dessous de
 * Number.MAX_SAFE_INTEGER pour éviter les pertes de précision en virgule flottante.
 */
export const MAX_AMOUNT = 1_000_000; // 1 million d'unités max par transaction
/** Montant minimal traitable (évite les poussières et les montants nuls). */
export const MIN_AMOUNT = 0.00000001; // 1e-8

export type AmountResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/**
 * Valide et normalise un montant fourni par le client.
 *
 * @param input  Valeur brute issue du body de la requête (type inconnu, jamais fiable).
 * @param opts   Bornes optionnelles spécifiques à l'endpoint (ex: retrait plafonné plus bas).
 */
export function parseAmount(
  input: unknown,
  opts: { min?: number; max?: number; decimals?: number } = {}
): AmountResult {
  const min = opts.min ?? MIN_AMOUNT;
  const max = opts.max ?? MAX_AMOUNT;
  const decimals = opts.decimals ?? TOKEN_DECIMALS;

  // 1. Type : on n'accepte qu'un number ou une string strictement numérique.
  let value: number;
  if (typeof input === "number") {
    value = input;
  } else if (typeof input === "string") {
    const trimmed = input.trim();
    // Rejette "", "1e5", "0x10", "  ", "1,5", "Infinity", etc.
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      return { ok: false, error: "Format de montant invalide" };
    }
    value = Number(trimmed);
  } else {
    return { ok: false, error: "Montant manquant ou de type invalide" };
  }

  // 2. Finitude : bloque NaN, Infinity, -Infinity (anti-overflow).
  if (!Number.isFinite(value)) {
    return { ok: false, error: "Montant non fini" };
  }

  // 3. Signe : aucun montant négatif ou nul.
  if (value <= 0) {
    return { ok: false, error: "Le montant doit être strictement positif" };
  }

  // 4. Bornes métier.
  if (value < min) {
    return { ok: false, error: `Montant minimum : ${min}` };
  }
  if (value > max) {
    return { ok: false, error: `Montant maximum autorisé : ${max}` };
  }

  // 5. Décimales : empêche la manipulation de précision (ex: 0.000000001).
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;
  // Si l'arrondi modifie la valeur, c'est qu'il y avait trop de décimales.
  if (rounded !== value) {
    return {
      ok: false,
      error: `Précision maximale : ${decimals} décimales`,
    };
  }

  return { ok: true, value: rounded };
}
