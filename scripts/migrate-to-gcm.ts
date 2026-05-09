/**
 * scripts/migrate-to-gcm.ts
 * Migration script to convert encrypted data from AES-256-CBC to AES-256-GCM
 * 
 * Run with: npx tsx scripts/migrate-to-gcm.ts
 * Or: node --env-file-if-exists=/vercel/share/.env.project -r tsx/cjs scripts/migrate-to-gcm.ts
 */
import { PrismaClient } from '@prisma/client';
import { decrypt, encrypt, isEncrypted, needsMigration } from '../lib/crypto';

const prisma = new PrismaClient();

async function migrateWallets() {
  console.log('🔐 Starting migration from AES-256-CBC to AES-256-GCM...\n');
  
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
        console.log(`⏭️  Wallet ${wallet.id}: No private key, skipping`);
        skipped++;
        continue;
      }

      // Already migrated to GCM
      if (isEncrypted(wallet.privateKey)) {
        console.log(`✅ Wallet ${wallet.id}: Already using GCM format`);
        skipped++;
        continue;
      }

      // Needs migration from CBC to GCM
      if (needsMigration(wallet.privateKey)) {
        console.log(`🔄 Wallet ${wallet.id}: Migrating from CBC to GCM...`);
        
        // Decrypt with CBC (handled automatically by decrypt function)
        const decrypted = decrypt(wallet.privateKey);
        
        // Re-encrypt with GCM
        const newEncrypted = encrypt(decrypted);
        
        // Update in database
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { privateKey: newEncrypted }
        });
        
        console.log(`   ✅ Migrated wallet ${wallet.id}`);
        migrated++;
      } else {
        console.log(`⚠️  Wallet ${wallet.id}: Unknown format, skipping`);
        skipped++;
      }
    } catch (error: any) {
      console.error(`❌ Wallet ${wallet.id}: Error - ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Errors:   ${errors}`);
  console.log('='.repeat(50));

  if (errors > 0) {
    console.log('\n⚠️  Some wallets failed to migrate. Please check the errors above.');
  } else {
    console.log('\n🎉 Migration completed successfully!');
  }
}

async function main() {
  try {
    await migrateWallets();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
