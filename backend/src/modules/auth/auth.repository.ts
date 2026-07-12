import { prisma } from '@config/database.js'

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export function createUser(data: { email: string; password: string; name: string }) {
  return prisma.user.create({ data })
}
