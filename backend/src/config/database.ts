import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { config } from '@config/env.js'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const adapter = new PrismaPg({ connectionString: config.DATABASE_URL })

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (config.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
