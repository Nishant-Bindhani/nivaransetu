import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '@utils/jwt.js'
import { AppError } from '@utils/AppError.js'

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Not authenticated', 401)
  }

  const token = authHeader.slice(7)

  try {
    req.user = verifyAccessToken(token)
  } catch {
    throw new AppError('Invalid or expired token', 401)
  }

  next()
}
