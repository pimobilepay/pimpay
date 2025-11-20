import { defineConfig } from '@prisma/config';

export default defineConfig({
  // Emplacement du schéma Prisma
  schema: './prisma/schema.prisma',

  // Emplacement de la sortie du client Prisma
  client: {
    output: './node_modules/@prisma/client'
  },

  // Commande de seed
  seed: 'ts-node prisma/seed.ts',

  // Paramètres supplémentaires recommandés
  formatOnSave: true
});
