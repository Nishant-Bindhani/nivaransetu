import { prisma } from '@config/database.js'
import { config } from '@config/env.js'
import { hashPassword } from '@utils/password.js'
import { generateToken, hashToken } from '@utils/hash.js'
import { AppError } from '@utils/AppError.js'
import { findUserByEmail, createUser } from './auth.repository.js'
import type { RegisterInput } from './auth.types.js'

export async function registerUser(input: RegisterInput) {
  const existing = await findUserByEmail(input.email)
  if (existing) {
    throw new AppError('Email already registered', 409)
  }

  const hashedPassword = await hashPassword(input.password)
  const user = await createUser({
    email: input.email,
    password: hashedPassword,
    name: input.name,
  })

  const rawToken = generateToken()
  const tokenHash = hashToken(rawToken)

  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      type: 'EMAIL_VERIFY',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  })

  // TODO: replace with real Resend email once configured
  // eslint-disable-next-line no-console
  console.log(`Verification link: ${config.FRONTEND_URL}/verify?token=${rawToken}`)

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
  }
}
