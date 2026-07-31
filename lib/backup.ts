// root/pimpay/lib/backup.ts
//
// Sauvegarde COMPLETE de la plateforme PimPay.
// Parcourt dynamiquement TOUTES les tables declarees dans le schema Prisma
// (via le DMMF) : aucune table n'est oubliee quand le schema evolue.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Nombre de lignes recuperees par requete (pagination). */
const BATCH_SIZE = Number(process.env.BACKUP_BATCH_SIZE || 1000);

/** Garde-fou memoire : lignes max exportees par table. */
const MAX_ROWS_PER_TABLE = Number(process.env.BACKUP_MAX_ROWS_PER_TABLE || 100000);

/** Champs sensibles masques uniquement quand `redactSecrets` est actif. */
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /privatekey/i,
  /secret/i,
  /mnemonic/i,
  /seed/i,
  /apikey/i,
  /accesstoken/i,
  /refreshtoken/i,
];

export interface BackupTableReport {
  model: string;
  table: string;
  rows: number;
  truncated: boolean;
  error?: string;
}

export interface FullBackupResult {
  /** Objet complet pret a etre serialise. */
  backup: Record<string, any>;
  /** JSON serialise (BigInt / Decimal / Date geres). */
  json: string;
  totalTables: number;
  exportedTables: number;
  totalRows: number;
  tables: BackupTableReport[];
  errors: BackupTableReport[];
  durationMs: number;
  sizeBytes: number;
}

/** Remplacant JSON : BigInt, Decimal, Date, Buffer. */
function jsonReplacer(_key: string, value: any) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    // Prisma.Decimal et Buffer
    if (typeof value.toJSON === "function" && value.constructor?.name === "Decimal") {
      return value.toString();
    }
    if (value.type === "Buffer" && Array.isArray(value.data)) {
      return `base64:${Buffer.from(value.data).toString("base64")}`;
    }
  }
  return value;
}

function isSensitive(field: string) {
  return SENSITIVE_FIELD_PATTERNS.some((p) => p.test(field));
}

function redactRow(row: Record<string, any>) {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    clean[key] = value !== null && value !== undefined && isSensitive(key) ? "[REDACTED]" : value;
  }
  return clean;
}

/** Nom du delegate Prisma correspondant a un modele (User -> user). */
function delegateName(modelName: string) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

/**
 * Exporte l'intégralité de la base de donnees, table par table.
 * @param options.redactSecrets masque les champs sensibles (cles privees, mots de passe...)
 */
export async function createFullBackup(options: {
  source: "MANUAL_ADMIN" | "AUTOMATIC_CRON";
  redactSecrets?: boolean;
  triggeredBy?: string | null;
}): Promise<FullBackupResult> {
  const startedAt = Date.now();
  const redactSecrets = options.redactSecrets ?? false;

  const models = Prisma.dmmf.datamodel.models;
  const data: Record<string, any[]> = {};
  const tables: BackupTableReport[] = [];
  const errors: BackupTableReport[] = [];
  let totalRows = 0;

  for (const model of models) {
    const key = delegateName(model.name);
    const delegate = (prisma as any)[key];
    const report: BackupTableReport = {
      model: model.name,
      table: model.dbName || model.name,
      rows: 0,
      truncated: false,
    };

    if (!delegate || typeof delegate.findMany !== "function") {
      report.error = "Delegate Prisma introuvable";
      errors.push(report);
      tables.push(report);
      continue;
    }

    try {
      const rows: any[] = [];
      let skip = 0;

      // Tri stable si le modele possede un champ d'identite classique.
      const fieldNames = model.fields.map((f) => f.name);
      const orderField = ["id", "createdAt", "date"].find((f) => fieldNames.includes(f));
      const orderBy = orderField ? { [orderField]: "asc" as const } : undefined;

      while (rows.length < MAX_ROWS_PER_TABLE) {
        const take = Math.min(BATCH_SIZE, MAX_ROWS_PER_TABLE - rows.length);
        const batch: any[] = await delegate.findMany({ take, skip, ...(orderBy ? { orderBy } : {}) });
        rows.push(...(redactSecrets ? batch.map(redactRow) : batch));
        if (batch.length < take) break;
        skip += take;
      }

      const remaining = await delegate.count().catch(() => rows.length);
      report.rows = rows.length;
      report.truncated = remaining > rows.length;

      data[model.name] = rows;
      totalRows += rows.length;
    } catch (e: any) {
      report.error = e?.message || "Erreur inconnue";
      errors.push(report);
      data[model.name] = [];
    }

    tables.push(report);
  }

  const backup = {
    meta: {
      platform: "PimPay",
      version: "2.0",
      format: "full-database-json",
      timestamp: new Date().toISOString(),
      source: options.source,
      triggeredBy: options.triggeredBy || null,
      redactedSecrets: redactSecrets,
      totalTables: models.length,
      exportedTables: tables.filter((t) => !t.error).length,
      totalRows,
      maxRowsPerTable: MAX_ROWS_PER_TABLE,
      tables,
      errors,
    },
    data,
  };

  const json = JSON.stringify(backup, jsonReplacer, 0);

  return {
    backup,
    json,
    totalTables: models.length,
    exportedTables: tables.filter((t) => !t.error).length,
    totalRows,
    tables,
    errors,
    durationMs: Date.now() - startedAt,
    sizeBytes: Buffer.byteLength(json, "utf8"),
  };
}
