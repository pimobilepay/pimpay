import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // Le "!" à la fin dit à TypeScript : "Fais-moi confiance, elle sera là"
    url: process.env.DATABASE_URL!,
  },
});
