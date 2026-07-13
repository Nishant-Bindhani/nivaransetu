import type { Request, Response } from 'express'
import { registerUser, verifyEmail } from './auth.service.js'
import { successResponse, successMessage } from '@utils/apiResponse.js'

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body)
  res.status(201).json(successResponse(user, 'Registration successful, please verify your email'))
}

export async function verifyEmailHandler(req: Request, res: Response) {
  await verifyEmail(req.body.token)
  res.status(200).json(successMessage('Email verified successfully'))
}
