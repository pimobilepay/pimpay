/** Table de correspondance pays -> libellé + code ISO (drapeau). */
const COUNTRY_MAP: Record<string, { label: string; iso: string }> = {
  cg: { label: "République du Congo", iso: "cg" },
  "republique du congo": { label: "République du Congo", iso: "cg" },
  congo: { label: "République du Congo", iso: "cg" },
  "congo-brazzaville": { label: "République du Congo", iso: "cg" },
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

/** Résout un libellé de pays en { label, iso } (iso vide si inconnu). */
export function resolveCountry(input?: string | null): { label: string; iso: string } {
  if (!input) return { label: "—", iso: "" };
  const key = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return COUNTRY_MAP[key] || { label: input, iso: "" };
}
