import { prisma } from '@config/database.js'

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export function createUser(data: { email: string; password: string; name: string }) {
  return prisma.user.create({ data })
}

export function findVerificationToken(tokenHash: string, type: 'EMAIL_VERIFY' | 'PASSWORD_RESET') {
  return prisma.verificationToken.findUnique({ where: { tokenHash, type } })
}

export function consumeVerificationToken(tokenId: string, userId: string) {
  return prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { isEmailVerified: true } }),
    prisma.verificationToken.delete({ where: { id: tokenId } }),
  ])
}

export function createRefreshToken(data: {
  userId: string
  familyId: string
  tokenHash: string
  expiresAt: Date
  deviceInfo?: string
  ipAddress?: string
}) {
  return prisma.refreshToken.create({ data })
}
