import { z } from 'zod'

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
})
