import { Router } from 'express'
import {
  register,
  verifyEmailHandler,
  login,
  refresh,
  logout,
  forgotPasswordHandler,
  resetPasswordHandler,
  googleRedirect,
  googleCallback,
  listSessionsHandler,
  revokeSessionHandler,
  revokeAllSessionsHandler,
} from './auth.controller.js'
import { validate } from '@middleware/validate.middleware.js'
import { requireAuth } from '@middleware/authenticate.middleware.js'
import { authRateLimit } from '@middleware/rateLimit.middleware.js'
import {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation.js'

const router = Router()

router.use(authRateLimit)

router.post('/register', validate(registerSchema), register)
router.post('/verify-email', validate(verifyEmailSchema), verifyEmailHandler)
router.post('/login', validate(loginSchema), login)
router.post('/refresh-token', refresh)
router.post('/logout', logout)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPasswordHandler)
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordHandler)
router.get('/google', googleRedirect)
router.get('/google/callback', googleCallback)
router.get('/sessions', requireAuth, listSessionsHandler)
router.delete('/sessions/:id', requireAuth, revokeSessionHandler)
router.delete('/sessions', requireAuth, revokeAllSessionsHandler)

export default router
