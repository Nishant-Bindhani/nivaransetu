import type { Request, Response } from 'express'
import ms from 'ms'
import { config } from '@config/env.js'
import { registerUser, verifyEmail, loginUser } from './auth.service.js'
import { successResponse, successMessage } from '@utils/apiResponse.js'

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body)
  res.status(201).json(successResponse(user, 'Registration successful, please verify your email'))
}

export async function verifyEmailHandler(req: Request, res: Response) {
  await verifyEmail(req.body.token)
  res.status(200).json(successMessage('Email verified successfully'))
}

export async function login(req: Request, res: Response) {
  const { accessToken, refreshToken, user } = await loginUser(req.body)

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ms(config.JWT_REFRESH_EXPIRES_IN as ms.StringValue),
  })

  res.status(200).json(successResponse({ accessToken, user }, 'Login successful'))
}
