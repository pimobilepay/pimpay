import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@pimpay.com";
  const adminPassword = "AdminPassword123!"; // Change ce mot de passe
  const adminPin = "0000"; // Change ce PIN

  // Hashage des secrets
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const hashedPin = await bcrypt.hash(adminPin, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Super Admin",
      email: adminEmail,
      phone: "+242000000000",
      password: hashedPassword,
      pin: hashedPin,
      balancePi: 1000,
      balanceUsd: 100,
      // Ajoute ici un champ rôle si tu en as un dans ton schéma (ex: role: "ADMIN")
    },
  });

  console.log("✅ Admin créé avec succès :", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
