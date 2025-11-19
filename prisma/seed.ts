/**
 * prisma/seed.ts — PIMPAY SEED
 * Run using:
 *  npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // HASH PASSWORD
  const hashedPassword = await bcrypt.hash("AdminPass123!", 10);

  // HASH PIN (0000)
  const hashedPin = await bcrypt.hash("0000", 10);

  // CREATE USER
  const user = await prisma.user.create({
    data: {
      email: "admin@pimpay.com",
      phone: "+243840000000",
      name: "Admin",
      fullName: "Pimpay Administrator",
      password: hashedPassword,
      pinHash: hashedPin,
      biometricEnabled: true,
      twoFactorEnabled: false,

      settings: {
        create: {
          language: "fr",
          locale: "fr-CD",
          pushEnabled: true,
        },
      },

      profile: {
        create: {
          avatarUrl: null,
          bio: "Compte administrateur",
          country: "CD",
          language: "fr",
        },
      },
    },
  });

  console.log("👤 User created:", user.email);

  // CREATE WALLETS
  const piWallet = await prisma.wallet.create({
    data: {
      userId: user.id,
      currency: "PI",
      balance: 150,
    },
  });

  const usdWallet = await prisma.wallet.create({
    data: {
      userId: user.id,
      currency: "USD",
      balance: 50,
    },
  });

  console.log("💰 Wallets created");

  // CREATE TRANSACTION
  const tx = await prisma.transaction.create({
    data: {
      reference: "TX-SEED-001",
      fromUserId: user.id,
      toUserId: user.id,
      fromWalletId: piWallet.id,
      toWalletId: usdWallet.id,
      amount: 10,
      fee: 0.1,
      currency: "PI",
      type: "TRANSFER",
      method: "WALLET",
      status: "SUCCESS",
      description: "Transaction de test",
    },
  });

  console.log("🔄 Transaction created");

  // QR PAYMENT
  const qrPayment = await prisma.qRPayment.create({
    data: {
      reference: "QR-SEED-001",
      userId: user.id,
      amount: 5,
      currency: "PI",
      label: "Paiement test QR",
    },
  });

  console.log("🔳 QR Payment created");

  // Notification
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "TRANSACTION",
      title: "Bienvenue sur PIMPAY",
      message: "Votre compte a été créé avec succès 🎉",
      read: false,
    },
  });

  console.log("🔔 Notification inserted");

  // Device
  await prisma.device.create({
    data: {
      userId: user.id,
      deviceId: "device-demo-001",
      platform: "android",
      pushToken: "push-token-demo",
    },
  });

  console.log("📱 Device created");

  // Support ticket
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject: "Problème de connexion",
      status: "OPEN",
    },
  });

  await prisma.message.create({
    data: {
      userId: user.id,
      subject: "Support",
      body: "Bonjour, j'ai un problème pour me connecter.",
      isSystem: false,
    },
  });

  console.log("🎫 Support ticket created");

  console.log("🌱 SEED COMPLETED SUCCESSFULLY!");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
