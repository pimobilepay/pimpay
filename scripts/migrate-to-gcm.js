/**
 * scripts/migrate-to-gcm.js
 * Migration script to convert encrypted data from AES-256-CBC to AES-256-GCM
 * 
 * Run with: node scripts/migrate-to-gcm.js
 * 
 * Make sure ENCRYPTION_KEY and DATABASE_URL are set in your environment.
 */
const { PrismaClient } = require('@prisma/client');
const { createCipheriv, createDecipheriv, randomBytes } = require('crypto');

const prisma = new PrismaClient();

// ============== CRYPTO FUNCTIONS ==============

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_VERSION = 'v1';

const LEGACY_ALGORITHM = 'aes-256-cbc';

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('[CRYPTO] ENCRYPTION_KEY manquante');
  const buf = Buffer.from(key, 'utf8');
  if (buf.length !== 32) throw new Error(`[CRYPTO] ENCRYPTION_KEY doit faire 32 bytes. Actuel: ${buf.length}`);
  return buf;
}

function encrypt(text) {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${KEY_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptLegacyCBC(text) {
  if (!text) throw new Error('[CRYPTO] Valeur vide');
  if (!text.includes(':')) {
    throw new Error('[CRYPTO] Format invalide — attendu: ivHex:encryptedHex');
  }

  const key = getEncryptionKey();
  const colonIdx = text.indexOf(':');
  const ivHex = text.slice(0, colonIdx);
  const encryptedHex = text.slice(colonIdx + 1);

  if (!/^[a-f0-9]{32}$/i.test(ivHex)) {
    throw new Error(`IV invalide (${ivHex.length} chars hex attendus: 32).`);
  }

  if (!encryptedHex || !/^[a-f0-9]+$/i.test(encryptedHex)) {
    throw new Error('Payload chiffre absent ou invalide.');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv(LEGACY_ALGORITHM, key, iv);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function isEncrypted(value) {
  return value.startsWith('v1:');
}

function isLegacyEncrypted(value) {
  return /^[a-f0-9]{32}:/i.test(value) && !value.startsWith('v1:');
}

// ============== MIGRATION ==============

async function migrateWallets() {
  console.log('Starting migration from AES-256-CBC to AES-256-GCM...\n');
  
  const wallets = await prisma.wallet.findMany({
    select: {
      id: true,
      privateKey: true,
      userId: true,
    }
  });

  console.log(`Found ${wallets.length} wallets to check.\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const wallet of wallets) {
    try {
      if (!wallet.privateKey) {
        console.log(`[SKIP] Wallet ${wallet.id}: No private key`);
        skipped++;
        continue;
      }

      // Already migrated to GCM
      if (isEncrypted(wallet.privateKey)) {
        console.log(`[OK] Wallet ${wallet.id}: Already using GCM format`);
        skipped++;
        continue;
      }

      // Needs migration from CBC to GCM
      if (isLegacyEncrypted(wallet.privateKey)) {
        console.log(`[MIGRATE] Wallet ${wallet.id}: Converting CBC to GCM...`);
        
        // Decrypt with CBC
        const decrypted = decryptLegacyCBC(wallet.privateKey);
        
        // Re-encrypt with GCM
        const newEncrypted = encrypt(decrypted);
        
        // Update in database
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { privateKey: newEncrypted }
        });
        
        console.log(`[DONE] Wallet ${wallet.id}: Migrated successfully`);
        migrated++;
      } else {
        console.log(`[WARN] Wallet ${wallet.id}: Unknown format, skipping`);
        skipped++;
      }
    } catch (error) {
      console.error(`[ERROR] Wallet ${wallet.id}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Migration Summary:');
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Errors:   ${errors}`);
  console.log('='.repeat(50));

  if (errors > 0) {
    console.log('\nSome wallets failed to migrate. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('\nMigration completed successfully!');
  }
}

async function main() {
  try {
    // Validate encryption key before starting
    getEncryptionKey();
    console.log('[OK] ENCRYPTION_KEY validated (32 bytes)\n');
    
    await migrateWallets();
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
