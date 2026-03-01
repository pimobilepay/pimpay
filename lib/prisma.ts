// root/pimpay/lib/prisma.ts

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    transactionOptions: {
      maxWait: 10000,  // 10s max to acquire a connection from the pool
      timeout: 30000,  // 30s max for the transaction to complete
    },
  })
}

// Use a single, stable PrismaClient instance.
// In development we cache it on `globalThis` to survive HMR.
// In production each cold-start creates one instance (which is expected).
export const prisma: PrismaClient = (() => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  const client = createPrismaClient()

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }

  return client
})()
