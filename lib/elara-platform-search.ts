// lib/elara-platform-search.ts
// -----------------------------------------------------------------------------
// ALGORITHME N°2 : recherche interne sur le contenu de la plateforme PimPay.
//
// Contrairement à la base de connaissances curée (lib/elara-brain.ts), qui ne
// couvre qu'un nombre limité de sujets rédigés à la main, ce module explore
// TOUT le texte réellement affiché dans l'application (libellés d'écrans,
// descriptions, aides contextuelles...) présent dans lib/i18n/locales/*.ts.
//
// Cela permet à Elara de répondre correctement même à des questions qui ne
// figurent pas dans la base de connaissances manuelle, en s'appuyant sur le
// contenu réel de l'app plutôt que d'inventer une réponse.
//
// Fonctionne SANS aucune clé API : c'est une recherche locale (scoring par
// chevauchement de mots), donc toujours disponible, y compris quand l'IA
// générative (AI_GATEWAY_API_KEY) n'est pas configurée.
// -----------------------------------------------------------------------------

import { fr } from "@/lib/i18n/locales/fr";
import { en } from "@/lib/i18n/locales/en";
import type { Lang } from "@/lib/elara-brain";

export interface PlatformMatch {
  path: string; // ex: "kyc.stepDocument.title"
  text: string; // valeur du libellé
  score: number;
}

// Mots trop fréquents pour être discriminants — ignorés du scoring.
const STOPWORDS = new Set([
  "le", "la", "les", "de", "des", "du", "un", "une", "et", "ou", "a", "au", "aux",
  "en", "pour", "dans", "sur", "par", "ce", "cette", "vos", "votre", "mon", "ma",
  "the", "of", "to", "a", "an", "and", "or", "in", "for", "on", "is", "are", "your", "my",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Aplati un objet de traductions imbriqué en une liste plate { path, text }.
// Mis en cache au niveau du module : calculé une seule fois par démarrage serveur.
function flatten(obj: unknown, prefix = "", out: { path: string; text: string }[] = []) {
  if (obj == null) return out;
  if (typeof obj === "string") {
    if (obj.trim().length > 1) out.push({ path: prefix, text: obj });
    return out;
  }
  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      flatten(value, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

let INDEX_FR: { path: string; text: string; tokens: string[] }[] | null = null;
let INDEX_EN: { path: string; text: string; tokens: string[] }[] | null = null;

function getIndex(lang: Lang): { path: string; text: string; tokens: string[] }[] {
  const source = lang === "en" ? en : fr; // repli FR pour le chinois (pas de corpus zh dédié ici)
  const cache = lang === "en" ? INDEX_EN : INDEX_FR;
  if (cache) return cache;

  const flat = flatten(source);
  const built = flat.map((e) => ({ ...e, tokens: tokenize(e.text) }));
  if (lang === "en") INDEX_EN = built;
  else INDEX_FR = built;
  return built;
}

/**
 * Recherche les libellés de l'application les plus pertinents pour une
 * question donnée. Renvoie `null` si aucune correspondance suffisamment
 * pertinente n'est trouvée (évite de fabriquer une réponse hors sujet).
 */
export function searchPlatformContent(query: string, lang: Lang, maxResults = 3): PlatformMatch[] | null {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return null;

  const index = getIndex(lang === "zh" ? "fr" : lang);
  const scored: PlatformMatch[] = [];

  for (const entry of index) {
    if (entry.tokens.length === 0) continue;
    let overlap = 0;
    for (const t of qTokens) {
      if (entry.tokens.includes(t)) overlap += 1;
    }
    if (overlap === 0) continue;
    // Score normalisé par la longueur du libellé : favorise les correspondances
    // précises (peu de bruit) plutôt que les gros blocs de texte génériques.
    const score = overlap / Math.sqrt(entry.tokens.length + 1);
    scored.push({ path: entry.path, text: entry.text, score });
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);

  // Seuil minimal : au moins un mot significatif partagé avec un score correct,
  // pour éviter de répondre avec un libellé UI sans rapport avec la question.
  const top = scored.filter((s) => s.score >= 0.6).slice(0, maxResults);
  return top.length > 0 ? top : null;
}
