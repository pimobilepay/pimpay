import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Supprime ou commente 'engine: classic' pour laisser Prisma utiliser le mode moderne/optimisé
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
