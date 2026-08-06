/**
 * ACCES A LA CAISSE AGENT (AgentFloat)
 *
 * La caisse d'un agent est STRICTEMENT separee de son wallet personnel :
 *  - `Wallet`      : argent personnel de l'utilisateur (comme n'importe quel client)
 *  - `AgentFloat`  : caisse professionnelle utilisee pour les operations agent
 *
 * Toutes les operations de caisse (cash-in, cash-out, provisionnement admin,
 * reprise de float) doivent passer par ces helpers, jamais par `tx.wallet`.
 *
 * Chaque ligne porte :
 *  - `balance`  : solde disponible immediatement
 *  - `reserved` : montant bloque par une operation en attente de confirmation
 */

import { DEFAULT_FLOAT_CURRENCY, FLOAT_CURRENCIES, type FloatCurrency } from "./agent-float";

/** Client Prisma ou client de transaction interactive. */
type Db = any;

export interface AgentFloatRow {
  id: string;
  userId: string;
  currency: string;
  balance: number;
  reserved: number;
}

export interface AgentFloatSummary {
  currency: string;
  balance: number;
  reserved: number;
  available: number;
}

/**
 * Recupere (ou cree a 0) la caisse d'un agent pour une devise.
 * Utiliser a l'interieur d'une transaction Prisma pour les mouvements d'argent.
 */
export async function getOrCreateAgentFloat(
  db: Db,
  userId: string,
  currency: string = DEFAULT_FLOAT_CURRENCY
): Promise<AgentFloatRow> {
  return db.agentFloat.upsert({
    where: { userId_currency: { userId, currency } },
    update: {},
    create: { userId, currency, balance: 0, reserved: 0 },
  });
}

/** Solde disponible de la caisse (hors montants reserves). */
export async function getAvailableFloat(
  db: Db,
  userId: string,
  currency: string = DEFAULT_FLOAT_CURRENCY
): Promise<number> {
  const row = await db.agentFloat.findUnique({
    where: { userId_currency: { userId, currency } },
    select: { balance: true, reserved: true },
  });
  if (!row) return 0;
  return round2(row.balance - row.reserved);
}

/**
 * Credite la caisse agent. Retourne le nouveau solde.
 * `amount` doit etre positif.
 */
export async function creditAgentFloat(
  db: Db,
  userId: string,
  amount: number,
  currency: string = DEFAULT_FLOAT_CURRENCY
): Promise<number> {
  if (!(amount > 0)) return getAvailableFloat(db, userId, currency);
  await getOrCreateAgentFloat(db, userId, currency);
  const updated = await db.agentFloat.update({
    where: { userId_currency: { userId, currency } },
    data: { balance: { increment: round2(amount) } },
  });
  return updated.balance;
}

/**
 * Debite la caisse agent apres verification du solde disponible.
 * Leve une erreur explicite si le float est insuffisant.
 */
export async function debitAgentFloat(
  db: Db,
  userId: string,
  amount: number,
  currency: string = DEFAULT_FLOAT_CURRENCY
): Promise<number> {
  const value = round2(amount);
  if (!(value > 0)) return getAvailableFloat(db, userId, currency);

  const row = await getOrCreateAgentFloat(db, userId, currency);
  const available = round2(row.balance - row.reserved);
  if (available < value) {
    throw new Error(
      `Float ${currency} insuffisant : disponible ${available.toLocaleString("fr-FR")} ${currency}`
    );
  }

  const updated = await db.agentFloat.update({
    where: { id: row.id },
    data: { balance: { decrement: value } },
  });
  return updated.balance;
}

/**
 * Bloque un montant de la caisse (operation en attente de confirmation).
 * Le solde total reste inchange, seul le disponible diminue.
 */
export async function reserveAgentFloat(
  db: Db,
  userId: string,
  amount: number,
  currency: string = DEFAULT_FLOAT_CURRENCY
): Promise<void> {
  const value = round2(amount);
  if (!(value > 0)) return;

  const row = await getOrCreateAgentFloat(db, userId, currency);
  const available = round2(row.balance - row.reserved);
  if (available < value) {
    throw new Error(
      `Float ${currency} insuffisant : disponible ${available.toLocaleString("fr-FR")} ${currency}`
    );
  }

  await db.agentFloat.update({
    where: { id: row.id },
    data: { reserved: { increment: value } },
  });
}

/** Libere un montant reserve sans le debiter (annulation / expiration). */
export async function releaseAgentFloat(
  db: Db,
  userId: string,
  amount: number,
  currency: string = DEFAULT_FLOAT_CURRENCY
): Promise<void> {
  const value = round2(amount);
  if (!(value > 0)) return;
  const row = await db.agentFloat.findUnique({
    where: { userId_currency: { userId, currency } },
    select: { id: true, reserved: true },
  });
  if (!row) return;
  await db.agentFloat.update({
    where: { id: row.id },
    data: { reserved: { decrement: Math.min(value, row.reserved) } },
  });
}

/** Consomme un montant reserve : il quitte definitivement la caisse. */
export async function settleReservedFloat(
  db: Db,
  userId: string,
  amount: number,
  currency: string = DEFAULT_FLOAT_CURRENCY
): Promise<void> {
  const value = round2(amount);
  if (!(value > 0)) return;
  const row = await db.agentFloat.findUnique({
    where: { userId_currency: { userId, currency } },
    select: { id: true, reserved: true, balance: true },
  });
  if (!row) return;
  await db.agentFloat.update({
    where: { id: row.id },
    data: {
      reserved: { decrement: Math.min(value, row.reserved) },
      balance: { decrement: value },
    },
  });
}

/**
 * Tous les soldes de caisse d'un agent, une entree par devise supportee
 * (meme si aucune ligne n'existe encore en base). Alimente le modal de
 * selection des soldes agent.
 */
export async function listAgentFloats(
  db: Db,
  userId: string
): Promise<AgentFloatSummary[]> {
  const rows: AgentFloatRow[] = await db.agentFloat.findMany({
    where: { userId },
    select: { currency: true, balance: true, reserved: true },
  });

  const byCurrency = new Map<string, { balance: number; reserved: number }>();
  for (const row of rows) {
    byCurrency.set(row.currency, { balance: row.balance, reserved: row.reserved });
  }

  const currencies = Array.from(
    new Set<string>([...FLOAT_CURRENCIES, ...byCurrency.keys()])
  );

  return currencies.map((currency) => {
    const row = byCurrency.get(currency) ?? { balance: 0, reserved: 0 };
    return {
      currency,
      balance: round2(row.balance),
      reserved: round2(row.reserved),
      available: round2(row.balance - row.reserved),
    };
  });
}

/** Devise de caisse valide, avec repli sur la devise par defaut. */
export function normalizeFloatCurrency(value: unknown): FloatCurrency {
  return (FLOAT_CURRENCIES as readonly string[]).includes(String(value))
    ? (String(value) as FloatCurrency)
    : DEFAULT_FLOAT_CURRENCY;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
