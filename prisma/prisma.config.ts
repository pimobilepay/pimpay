import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "./schema.prisma",
  datasource: {
    db: {
      provider: "postgresql",
      // L'URL est prise depuis l'environnement (bon pour Vercel/Termux)
      directUrl: process.env.DATABASE_URL!,
    },
  },
});
