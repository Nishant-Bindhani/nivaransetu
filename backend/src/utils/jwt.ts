import jwt from 'jsonwebtoken'
import { config } from '@config/env.js'

export type AccessTokenPayload = {
  userId: string
  role: string
  orgId?: string
  deptId?: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload
}
