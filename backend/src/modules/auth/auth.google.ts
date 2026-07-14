import { config } from '@config/env.js'
import { AppError } from '@utils/AppError.js'
import type { GoogleTokenResponse, GoogleProfile } from './auth.types.js'

export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.GOOGLE_CLIENT_ID ?? '',
      client_secret: config.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: config.GOOGLE_CALLBACK_URL ?? '',
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    throw new AppError('Google authentication failed', 401)
  }

  const { access_token } = (await response.json()) as GoogleTokenResponse
  return access_token
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new AppError('Google authentication failed', 401)
  }

  return (await response.json()) as GoogleProfile
}
