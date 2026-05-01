// root/pimpay/lib/prisma.ts

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    transactionOptions: {
      maxWait: 10000,
      timeout: 30000,
    },
  })
}

// Singleton Prisma — critique en serverless Vercel.
// On cache sur globalThis même en production pour réutiliser
// les connexions entre invocations chaudes (warm lambda).
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? (() => {
    const client = createPrismaClient()
    globalForPrisma.prisma = client
    return client
  })()
