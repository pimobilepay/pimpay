/**
 * Utilitaires d'export CSV.
 *
 * Les fichiers generes sont destines a etre ouverts dans Excel / LibreOffice :
 * on prefixe donc le contenu d'un BOM UTF-8 afin que les accents s'affichent
 * correctement, et on echappe les valeurs selon la RFC 4180.
 */

export type CsvCell = string | number | boolean | Date | null | undefined;

/** Echappe une valeur pour une cellule CSV. */
export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";

  let raw: string;
  if (value instanceof Date) {
    raw = value.toISOString();
  } else if (typeof value === "boolean") {
    raw = value ? "Oui" : "Non";
  } else if (typeof value === "number") {
    raw = Number.isFinite(value) ? String(value) : "";
  } else {
    raw = value;
  }

  // Neutralise les formules (protection contre l'injection CSV dans Excel).
  if (/^[=+\-@\t\r]/.test(raw)) {
    raw = `'${raw}`;
  }

  if (/[",\n\r;]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/** Construit une ligne CSV. */
export function csvRow(cells: CsvCell[]): string {
  return cells.map(csvCell).join(",");
}

/**
 * Construit un document CSV complet a partir d'un en-tete et de lignes.
 * `blocks` permet de concatener plusieurs tableaux dans un meme fichier.
 */
export function buildCsv(
  blocks: Array<{ title?: string; header?: CsvCell[]; rows: CsvCell[][] }>
): string {
  const lines: string[] = [];

  blocks.forEach((block, index) => {
    if (index > 0) lines.push("");
    if (block.title) {
      lines.push(csvRow([block.title]));
    }
    if (block.header) {
      lines.push(csvRow(block.header));
    }
    for (const row of block.rows) {
      lines.push(csvRow(row));
    }
  });

  return lines.join("\r\n");
}

/** Reponse HTTP telechargeable pour un contenu CSV. */
export function csvResponse(content: string, filename: string): Response {
  // \uFEFF = BOM UTF-8, indispensable pour Excel.
  return new Response(`\uFEFF${content}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Genere un nom de fichier horodate. */
export function csvFilename(prefix: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const safe = prefix.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase();
  return `${safe}_${stamp}.csv`;
}
