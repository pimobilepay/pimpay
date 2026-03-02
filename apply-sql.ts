import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Connexion à PimpayDB sur Neon...");
  
  try {
    const sqlPath = path.join(process.cwd(), 'scripts', 'add-fee-columns.sql');
    const sqlFile = fs.readFileSync(sqlPath, 'utf8');

    // On sépare les commandes par le point-virgule et on nettoie les espaces/commentaires
    const commands = sqlFile
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📦 ${commands.length} commandes détectées. Début de l'exécution...`);

    for (let i = 0; i < commands.length; i++) {
      console.log(`执行 command [${i + 1}/${commands.length}]...`);
      await prisma.$executeRawUnsafe(commands[i]);
    }
    
    console.log("✅ Terminé ! Toutes les colonnes de frais sont maintenant dans PimpayDB.");
  } catch (error: any) {
    console.error("❌ Erreur lors de l'exécution :");
    console.error(error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
