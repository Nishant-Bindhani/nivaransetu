import { prisma } from '@config/database.js'

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

export function createUser(data: { email: string; password: string; name: string }) {
  return prisma.user.create({ data })
}

export function findUserByGoogleId(googleId: string) {
  return prisma.user.findUnique({ where: { googleId } })
}

export function linkGoogleAccount(userId: string, googleId: string) {
  return prisma.user.update({ where: { id: userId }, data: { googleId } })
}

export function createGoogleUser(data: { email: string; name: string; googleId: string }) {
  return prisma.user.create({ data: { ...data, isEmailVerified: true } })
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

export function resetUserPassword(tokenId: string, userId: string, hashedPassword: string) {
  return prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } }),
    prisma.verificationToken.delete({ where: { id: tokenId } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
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

export function findRefreshToken(tokenHash: string) {
  return prisma.refreshToken.findUnique({ where: { tokenHash } })
}

export function deleteRefreshToken(id: string) {
  return prisma.refreshToken.delete({ where: { id } })
}

export function deleteTokenFamily(familyId: string) {
  return prisma.refreshToken.deleteMany({ where: { familyId } })
}

export function findRefreshTokensByUserId(userId: string) {
  return prisma.refreshToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export function deleteRefreshTokenForUser(id: string, userId: string) {
  return prisma.refreshToken.deleteMany({ where: { id, userId } })
}
