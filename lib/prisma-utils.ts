// lib/prisma-utils.ts
import prisma from "./prisma";

export async function upsertOTP(phone: string, code: string, expiresAt: Date) {
  // assumes model Otp { phone String @id, code String, expiresAt DateTime }
  return prisma.oTP.upsert({
    where: { phone },
    update: { code, expiresAt },
    create: { phone, code, expiresAt },
  }).catch(() => null);
}
