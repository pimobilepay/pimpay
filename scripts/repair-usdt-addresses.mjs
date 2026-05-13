/**
 * ============================================================
 *  PimPay — Script de réparation des adresses USDT (TRC20)
 * ============================================================
 *
 * PROBLÈME : L'ancien générateur produisait des adresses invalides
 * (SHA256 hex) contenant des caractères exclus de l'alphabet Base58
 * (zéro "0", lettre O, etc.).  Ces adresses sont rejetées par le
 * réseau Tron avec l'erreur "network mismatch".
 *
 * CE SCRIPT :
 *   1. Lit tous les utilisateurs ayant une usdtAddress
 *   2. Détecte celles qui ne respectent pas le format Base58Check Tron
 *   3. En génère de nouvelles avec l'algorithme officiel
 *   4. Met à jour la base de données (adresse + clé privée chiffrée)
 *
 * USAGE :
 *   node scripts/repair-usdt-addresses.mjs [--dry-run]
 *
 * OPTIONS :
 *   --dry-run   Affiche les adresses invalides SANS modifier la DB
 *   --reset     Supprime TOUTES les adresses USDT (régénération à
 *               la prochaine connexion de chaque utilisateur)
 *
 * PRÉREQUIS :
 *   npm install @prisma/client ethers
 *   (déjà présents dans le projet PimPay)
 * ============================================================
 */

import { PrismaClient } from "@prisma/client";
import { Wallet as EthWallet } from "ethers";
import crypto from "crypto";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ─── Configuration ────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const RESET_ALL = process.argv.includes("--reset");

// Alphabet Base58 (Bitcoin / Tron) — exclut 0, O, I, l
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Regex d'une adresse TRC20 valide : T + exactement 33 caractères Base58
const TRON_VALID_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

// ─── Chiffrement AES-256-GCM (compatible avec lib/crypto.ts de PimPay) ───────

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "";

if (!ENCRYPTION_KEY) {
  console.error("❌  Variable ENCRYPTION_KEY ou NEXTAUTH_SECRET manquante dans l'environnement.");
  console.error("    Ajoutez-la dans votre fichier .env avant de lancer ce script.");
  process.exit(1);
}

function encrypt(text) {
  // Utilise le même format que lib/crypto.ts : iv:tag:ciphertext (hex, séparés par ":")
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).substring(0, 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

// ─── Génération d'adresse Tron (Base58Check officiel) ─────────────────────────

function generateValidTronWallet() {
  // 1. Clé privée via secp256k1 (même courbe que Tron)
  const evmWallet = EthWallet.createRandom();
  const privateKey = evmWallet.privateKey.replace("0x", "");

  // 2. Adresse Ethereum = KECCAK256(pubKey non-compressée)[12:]
  const ethAddress = evmWallet.address; // "0x" + 40 hex

  // 3. Préfixe réseau Tron : 0x41 + 20 octets adresse
  const addrBytes = Buffer.concat([
    Buffer.from("41", "hex"),
    Buffer.from(ethAddress.replace("0x", ""), "hex"),
  ]);

  // 4. Checksum = double SHA256, 4 premiers octets
  const h1 = crypto.createHash("sha256").update(addrBytes).digest();
  const h2 = crypto.createHash("sha256").update(h1).digest();
  const payload = Buffer.concat([addrBytes, h2.slice(0, 4)]);

  // 5. Encodage Base58
  let n = BigInt("0x" + payload.toString("hex"));
  let address = "";
  while (n > 0n) {
    address = BASE58[Number(n % 58n)] + address;
    n = n / 58n;
  }

  return { address, privateKey };
}

// ─── Utilitaires d'affichage ──────────────────────────────────────────────────

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const BOLD   = "\x1b[1m";
const RESET  = "\x1b[0m";

function log(color, symbol, message) {
  console.log(`${color}${symbol}${RESET}  ${message}`);
}

// ─── Script principal ─────────────────────────────────────────────────────────

const prisma = new PrismaClient();

async function main() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║   PimPay — Réparation adresses USDT TRC20        ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}\n`);

  if (DRY_RUN)   log(YELLOW, "⚠", `Mode DRY-RUN activé — aucune modification ne sera faite.`);
  if (RESET_ALL) log(YELLOW, "⚠", `Mode RESET — toutes les adresses USDT seront supprimées.`);
  console.log();

  // ── MODE RESET : suppression de toutes les adresses ──────────────────────
  if (RESET_ALL) {
    const countRes = await prisma.user.count({ where: { usdtAddress: { not: null } } });
    log(CYAN, "📊", `${countRes} utilisateurs avec une adresse USDT.`);

    if (!DRY_RUN) {
      const { count } = await prisma.user.updateMany({
        where: { usdtAddress: { not: null } },
        data: { usdtAddress: null, usdtPrivateKey: null },
      });
      log(GREEN, "✅", `${count} adresses USDT supprimées.`);
      log(CYAN,  "ℹ", `Les utilisateurs recevront une nouvelle adresse à leur prochaine connexion.`);
    } else {
      log(YELLOW, "✋", `[DRY-RUN] Aurait supprimé ${countRes} adresses.`);
    }

    await prisma.$disconnect();
    return;
  }

  // ── MODE RÉPARATION : détecter et corriger les adresses invalides ─────────

  const users = await prisma.user.findMany({
    where: { usdtAddress: { not: null } },
    select: { id: true, username: true, email: true, usdtAddress: true },
  });

  log(CYAN, "📊", `${users.length} utilisateurs avec une adresse USDT trouvés.`);

  const valid   = users.filter(u => TRON_VALID_REGEX.test(u.usdtAddress ?? ""));
  const invalid = users.filter(u => !TRON_VALID_REGEX.test(u.usdtAddress ?? ""));

  log(GREEN,  "✅", `${valid.length} adresses valides (Base58Check conforme).`);
  log(invalid.length > 0 ? RED : GREEN, invalid.length > 0 ? "❌" : "✅", `${invalid.length} adresses invalides à réparer.`);
  console.log();

  if (invalid.length === 0) {
    log(GREEN, "🎉", "Aucune réparation nécessaire. Toutes les adresses sont valides !");
    await prisma.$disconnect();
    return;
  }

  // Afficher le détail des adresses invalides
  console.log(`${BOLD}Adresses invalides détectées :${RESET}`);
  console.log("─".repeat(70));
  for (const u of invalid) {
    const label = u.username || u.email || u.id;
    console.log(`  ${RED}✗${RESET}  ${label.padEnd(30)} ${YELLOW}${u.usdtAddress}${RESET}`);
  }
  console.log("─".repeat(70));
  console.log();

  if (DRY_RUN) {
    log(YELLOW, "✋", `[DRY-RUN] Aucune modification. Relancez sans --dry-run pour réparer.`);
    await prisma.$disconnect();
    return;
  }

  // Réparation
  let repaired = 0;
  let errors   = 0;

  log(CYAN, "🔧", "Démarrage de la réparation...\n");

  for (const user of invalid) {
    try {
      const { address: newAddress, privateKey } = generateValidTronWallet();

      // Vérification de sécurité avant d'écrire
      if (!TRON_VALID_REGEX.test(newAddress)) {
        throw new Error(`Adresse générée toujours invalide: ${newAddress}`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          usdtAddress:    newAddress,
          usdtPrivateKey: encrypt(privateKey),
        },
      });

      const label = user.username || user.email || user.id;
      console.log(`  ${GREEN}✓${RESET}  ${label.padEnd(30)} ${RED}${(user.usdtAddress ?? "").substring(0, 18)}...${RESET} → ${GREEN}${newAddress}${RESET}`);
      repaired++;
    } catch (err) {
      const label = user.username || user.email || user.id;
      console.log(`  ${RED}✗${RESET}  ${label.padEnd(30)} ERREUR: ${err.message}`);
      errors++;
    }
  }

  console.log();
  console.log("─".repeat(70));
  log(GREEN, "✅", `${repaired} adresses réparées avec succès.`);
  if (errors > 0) log(RED, "❌", `${errors} erreurs (voir les lignes ci-dessus).`);
  console.log();
  log(CYAN, "ℹ", "Les utilisateurs concernés pourront désormais recevoir des dépôts USDT.");
  console.log();

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(`\n${RED}Erreur fatale:${RESET}`, err.message);
  await prisma.$disconnect();
  process.exit(1);
});
