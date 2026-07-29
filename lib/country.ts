/** Table de correspondance pays -> libellé + code ISO (drapeau). */
const COUNTRY_MAP: Record<string, { label: string; iso: string }> = {
  cg: { label: "République du Congo", iso: "cg" },
  "republique du congo": { label: "République du Congo", iso: "cg" },
  congo: { label: "République du Congo", iso: "cg" },
  "congo-brazzaville": { label: "République du Congo", iso: "cg" },
  "congo brazzaville": { label: "République du Congo", iso: "cg" },
  brazzaville: { label: "République du Congo", iso: "cg" },
  "congo br": { label: "République du Congo", iso: "cg" },
  cd: { label: "RD Congo", iso: "cd" },
  "rd congo": { label: "RD Congo", iso: "cd" },
  "republique democratique du congo": { label: "RD Congo", iso: "cd" },
  cm: { label: "Cameroun", iso: "cm" },
  cameroun: { label: "Cameroun", iso: "cm" },
  ga: { label: "Gabon", iso: "ga" },
  gabon: { label: "Gabon", iso: "ga" },
  cf: { label: "Centrafrique", iso: "cf" },
  centrafrique: { label: "Centrafrique", iso: "cf" },
  td: { label: "Tchad", iso: "td" },
  tchad: { label: "Tchad", iso: "td" },
  ci: { label: "Côte d'Ivoire", iso: "ci" },
  "cote d'ivoire": { label: "Côte d'Ivoire", iso: "ci" },
  sn: { label: "Sénégal", iso: "sn" },
  senegal: { label: "Sénégal", iso: "sn" },
  ml: { label: "Mali", iso: "ml" },
  mali: { label: "Mali", iso: "ml" },
  bf: { label: "Burkina Faso", iso: "bf" },
  "burkina faso": { label: "Burkina Faso", iso: "bf" },
  bj: { label: "Bénin", iso: "bj" },
  benin: { label: "Bénin", iso: "bj" },
  tg: { label: "Togo", iso: "tg" },
  togo: { label: "Togo", iso: "tg" },
  ng: { label: "Nigeria", iso: "ng" },
  nigeria: { label: "Nigeria", iso: "ng" },
  fr: { label: "France", iso: "fr" },
  france: { label: "France", iso: "fr" },
};

import { countries } from "@/lib/country-data";

/** Normalise une chaîne pour comparaison (minuscules, sans accents). */
function normalizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Index universel construit à partir de la liste complète des pays
 * (nom + code ISO alpha-2). Permet de résoudre n'importe quel pays,
 * pas seulement ceux listés manuellement dans COUNTRY_MAP.
 */
const WORLD_INDEX: Record<string, { label: string; iso: string }> = (() => {
  const idx: Record<string, { label: string; iso: string }> = {};
  for (const c of countries) {
    const iso = c.code.toLowerCase();
    const entry = { label: c.name, iso };
    idx[normalizeKey(c.name)] = entry;
    idx[iso] = entry;
  }
  return idx;
})();

/** Résout un libellé de pays en { label, iso } (iso vide si inconnu). */
export function resolveCountry(input?: string | null): { label: string; iso: string } {
  if (!input) return { label: "—", iso: "" };
  const key = normalizeKey(input);
  // 1) Alias manuels (variantes/orthographes FR spécifiques).
  // 2) Repli sur l'index mondial complet (nom ou code ISO).
  return COUNTRY_MAP[key] || WORLD_INDEX[key] || { label: input, iso: "" };
}
