import type { Request, Response } from 'express'
import { registerUser } from './auth.service.js'
import { successResponse } from '@utils/apiResponse.js'

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body)
  res.status(201).json(successResponse(user, 'Registration successful, please verify your email'))
}
