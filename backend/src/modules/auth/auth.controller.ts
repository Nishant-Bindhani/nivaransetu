import type { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { URL } from 'node:url'
import ms from 'ms'
import { config } from '@config/env.js'
import {
  registerUser,
  verifyEmail,
  loginUser,
  refreshTokens,
  logoutUser,
  forgotPassword,
  resetPassword,
  googleAuth,
} from './auth.service.js'
import { successResponse, successMessage } from '@utils/apiResponse.js'
import { AppError } from '@utils/AppError.js'

function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ms(config.JWT_REFRESH_EXPIRES_IN as ms.StringValue),
  })
}

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
  setRefreshTokenCookie(res, refreshToken)
  res.status(200).json(successResponse({ accessToken, user }, 'Login successful'))
}

export async function refresh(req: Request, res: Response) {
  const rawToken = req.cookies.refreshToken
  if (!rawToken) {
    throw new AppError('No refresh token provided', 401)
  }

  const { accessToken, refreshToken } = await refreshTokens(rawToken)
  setRefreshTokenCookie(res, refreshToken)
  res.status(200).json(successResponse({ accessToken }, 'Token refreshed'))
}

export async function logout(req: Request, res: Response) {
  const rawToken = req.cookies.refreshToken
  if (rawToken) {
    await logoutUser(rawToken)
  }

  res.clearCookie('refreshToken')
  res.status(200).json(successMessage('Logged out successfully'))
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  await forgotPassword(req.body.email)
  res.status(200).json(successMessage('If that email is registered, a reset link has been sent'))
}

export async function resetPasswordHandler(req: Request, res: Response) {
  await resetPassword(req.body.token, req.body.password)
  res.status(200).json(successMessage('Password reset successful, please log in again'))
}

export function googleRedirect(req: Request, res: Response) {
  const state = randomUUID()

  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ms(config.GOOGLE_OAUTH_STATE_TTL as ms.StringValue),
  })

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.set('client_id', config.GOOGLE_CLIENT_ID ?? '')
  googleAuthUrl.searchParams.set('redirect_uri', config.GOOGLE_CALLBACK_URL ?? '')
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('scope', 'email profile')
  googleAuthUrl.searchParams.set('state', state)

  res.redirect(googleAuthUrl.toString())
}

export async function googleCallback(req: Request, res: Response) {
  const { code, state } = req.query
  const storedState = req.cookies.oauth_state

  res.clearCookie('oauth_state')

  if (!code || !state || state !== storedState) {
    throw new AppError('Invalid OAuth state, please try signing in again', 400)
  }

  const { accessToken, refreshToken } = await googleAuth(String(code))
  setRefreshTokenCookie(res, refreshToken)

  res.redirect(`${config.FRONTEND_URL}/oauth-callback?token=${accessToken}`)
}
