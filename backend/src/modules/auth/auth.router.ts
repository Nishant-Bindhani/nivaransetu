import { Router } from 'express'
import {
  register,
  verifyEmailHandler,
  login,
  refresh,
  logout,
  forgotPasswordHandler,
  resetPasswordHandler,
} from './auth.controller.js'
import { validate } from '@middleware/validate.middleware.js'
import {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/verify-email', validate(verifyEmailSchema), verifyEmailHandler)
router.post('/login', validate(loginSchema), login)
router.post('/refresh-token', refresh)
router.post('/logout', logout)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPasswordHandler)
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordHandler)

export default router
