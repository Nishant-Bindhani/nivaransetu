import ms from 'ms'
import { randomUUID } from 'crypto'
import { prisma } from '@config/database.js'
import { config } from '@config/env.js'
import { hashPassword, verifyPassword } from '@utils/password.js'
import { generateToken, hashToken } from '@utils/hash.js'
import { signAccessToken } from '@utils/jwt.js'
import { AppError } from '@utils/AppError.js'
import {
  findUserByEmail,
  createUser,
  findVerificationToken,
  consumeVerificationToken,
  createRefreshToken,
} from './auth.repository.js'
import type { RegisterInput, LoginInput } from './auth.types.js'

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
      expiresAt: new Date(Date.now() + ms(config.EMAIL_VERIFY_EXPIRES_IN as ms.StringValue)),
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

export async function verifyEmail(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const token = await findVerificationToken(tokenHash, 'EMAIL_VERIFY')

  if (!token || token.expiresAt < new Date()) {
    throw new AppError('Invalid or expired verification link', 400)
  }

  await consumeVerificationToken(token.id, token.userId)
}

export async function loginUser(input: LoginInput) {
  const user = await findUserByEmail(input.email)
  if (!user || !user.password) {
    throw new AppError('Invalid email or password', 401)
  }

  const validPassword = await verifyPassword(user.password, input.password)
  if (!validPassword) {
    throw new AppError('Invalid email or password', 401)
  }

  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email before logging in', 403)
  }

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    orgId: user.orgId ?? undefined,
    deptId: user.deptId ?? undefined,
  })

  const familyId = randomUUID()
  const rawRefreshToken = generateToken()

  await createRefreshToken({
    userId: user.id,
    familyId,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: new Date(Date.now() + ms(config.JWT_REFRESH_EXPIRES_IN as ms.StringValue)),
  })

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  }
}
