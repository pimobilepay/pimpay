/**
 * scripts/reset-defense-threshold.ts
 *
 * [FIX PROTECTION INTRUSION] Correctif d'urgence pour une plateforme restée
 * en "verrouillage total" (riskScoreThreshold <= 30 dans SystemConfig) : ce
 * réglage bloque TOUT le trafic entrant (HTTP 403), y compris les
 * utilisateurs légitimes, à l'exception de la liste blanche. L'interface
 * admin (/admin/intrusion) et l'API (/api/admin/intrusion) empêchent
 * désormais d'atteindre ce seuil par erreur (confirmation explicite requise),
 * mais si la valeur est DÉJÀ à 30 (ou moins) en base — par ex. réglage fait
 * avant ce correctif — ce script la ramène au seuil recommandé et équilibré
 * de 75, sans avoir besoin de repasser par l'interface (qui serait
 * elle-même bloquée si l'IP de l'admin n'est pas en liste blanche).
 *
 * Usage (voir script npm "defense:reset-threshold") :
 *   npm run defense:reset-threshold
 *   npm run defense:reset-threshold -- --value=75   (valeur custom)
 */

import { prisma } from "../lib/prisma";

const RECOMMENDED_THRESHOLD = 75;
const LOCKDOWN_THRESHOLD = 30;

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--value="));
  const target = arg ? Number(arg.split("=")[1]) : RECOMMENDED_THRESHOLD;

  if (!Number.isFinite(target) || target < 0 || target > 100) {
    console.error(`Valeur invalide : ${arg}. Attendu un nombre entre 0 et 100.`);
    process.exitCode = 1;
    return;
  }

  const current = await prisma.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });

  if (!current) {
    console.log(
      `Aucune configuration existante (SystemConfig/GLOBAL_CONFIG) : création avec riskScoreThreshold=${target}.`,
    );
    await prisma.systemConfig.create({ data: { id: "GLOBAL_CONFIG", riskScoreThreshold: target } });
    console.log("✅ Réglage créé.");
    return;
  }

  console.log(`Seuil actuel : ${current.riskScoreThreshold}`);

  if (current.riskScoreThreshold > LOCKDOWN_THRESHOLD && target === RECOMMENDED_THRESHOLD) {
    console.log(
      `Le seuil actuel (${current.riskScoreThreshold}) n'est pas en verrouillage total (≤ ${LOCKDOWN_THRESHOLD}). Aucune action nécessaire.`,
    );
    return;
  }

  await prisma.systemConfig.update({
    where: { id: "GLOBAL_CONFIG" },
    data: { riskScoreThreshold: target },
  });

  console.log(`✅ Seuil de risque mis à jour : ${current.riskScoreThreshold} → ${target}.`);
  console.log(
    "Le cache en mémoire de l'application (30s max) expirera de lui-même ; redémarrer le serveur applique le changement immédiatement.",
  );
}

main()
  .catch((err) => {
    console.error("Échec du script :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
