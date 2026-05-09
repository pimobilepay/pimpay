/**
 * scripts/migrate-to-gcm.js
 * Migration script to convert encrypted data from AES-256-CBC to AES-256-GCM
 * 
 * Run with: node --env-file=.env scripts/migrate-to-gcm.js
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
  return value && value.startsWith('v1:');
}

function isLegacyEncrypted(value) {
  return value && /^[a-f0-9]{32}:/i.test(value) && !value.startsWith('v1:');
}

// ============== MIGRATION HELPERS ==============

async function migrateField(record, fieldName, tableName, updateFn) {
  const value = record[fieldName];
  
  if (!value) {
    return { status: 'skip', reason: 'empty' };
  }

  if (isEncrypted(value)) {
    return { status: 'skip', reason: 'already_gcm' };
  }

  if (isLegacyEncrypted(value)) {
    try {
      const decrypted = decryptLegacyCBC(value);
      const newEncrypted = encrypt(decrypted);
      await updateFn({ [fieldName]: newEncrypted });
      return { status: 'migrated' };
    } catch (error) {
      return { status: 'error', reason: error.message };
    }
  }

  return { status: 'skip', reason: 'unknown_format' };
}

// ============== MIGRATE USERS ==============

async function migrateUsers() {
  console.log('\n--- Migrating User private keys ---\n');
  
  const privateKeyFields = [
    'sidraPrivateKey',
    'stellarPrivateKey',
    'walletPrivateKey',
    'xrpPrivateKey',
    'usdtPrivateKey',
    'solPrivateKey'
  ];

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      sidraPrivateKey: true,
      stellarPrivateKey: true,
      walletPrivateKey: true,
      xrpPrivateKey: true,
      usdtPrivateKey: true,
      solPrivateKey: true,
    }
  });

  console.log(`Found ${users.length} users to check.\n`);

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const user of users) {
    const userLabel = user.username || user.id;

    for (const field of privateKeyFields) {
      const result = await migrateField(
        user,
        field,
        'User',
        async (data) => {
          await prisma.user.update({
            where: { id: user.id },
            data
          });
        }
      );

      if (result.status === 'migrated') {
        console.log(`[MIGRATED] User ${userLabel}: ${field}`);
        totalMigrated++;
      } else if (result.status === 'error') {
        console.error(`[ERROR] User ${userLabel}: ${field} - ${result.reason}`);
        totalErrors++;
      } else if (result.reason === 'already_gcm') {
        console.log(`[OK] User ${userLabel}: ${field} already GCM`);
        totalSkipped++;
      }
      // Skip silent for empty fields
    }
  }

  return { migrated: totalMigrated, skipped: totalSkipped, errors: totalErrors };
}

// ============== MIGRATE SYSTEM WALLETS ==============

async function migrateSystemWallets() {
  console.log('\n--- Migrating SystemWallet private keys ---\n');

  const systemWallets = await prisma.systemWallet.findMany({
    select: {
      id: true,
      name: true,
      privateKey: true,
    }
  });

  console.log(`Found ${systemWallets.length} system wallets to check.\n`);

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const wallet of systemWallets) {
    const result = await migrateField(
      wallet,
      'privateKey',
      'SystemWallet',
      async (data) => {
        await prisma.systemWallet.update({
          where: { id: wallet.id },
          data
        });
      }
    );

    if (result.status === 'migrated') {
      console.log(`[MIGRATED] SystemWallet ${wallet.name}: privateKey`);
      totalMigrated++;
    } else if (result.status === 'error') {
      console.error(`[ERROR] SystemWallet ${wallet.name}: ${result.reason}`);
      totalErrors++;
    } else if (result.reason === 'already_gcm') {
      console.log(`[OK] SystemWallet ${wallet.name}: already GCM`);
      totalSkipped++;
    } else if (result.reason === 'empty') {
      console.log(`[SKIP] SystemWallet ${wallet.name}: no private key`);
      totalSkipped++;
    }
  }

  return { migrated: totalMigrated, skipped: totalSkipped, errors: totalErrors };
}

// ============== MAIN ==============

async function main() {
  try {
    // Validate encryption key before starting
    getEncryptionKey();
    console.log('[OK] ENCRYPTION_KEY validated (32 bytes)');
    console.log('\nStarting migration from AES-256-CBC to AES-256-GCM...');

    const userResults = await migrateUsers();
    const systemWalletResults = await migrateSystemWallets();

    const totalMigrated = userResults.migrated + systemWalletResults.migrated;
    const totalSkipped = userResults.skipped + systemWalletResults.skipped;
    const totalErrors = userResults.errors + systemWalletResults.errors;

    console.log('\n' + '='.repeat(50));
    console.log('Migration Summary:');
    console.log(`   Migrated: ${totalMigrated}`);
    console.log(`   Skipped:  ${totalSkipped}`);
    console.log(`   Errors:   ${totalErrors}`);
    console.log('='.repeat(50));

    if (totalErrors > 0) {
      console.log('\nSome records failed to migrate. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('\nMigration completed successfully!');
    }
  } catch (error) {
    console.error('\nMigration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
