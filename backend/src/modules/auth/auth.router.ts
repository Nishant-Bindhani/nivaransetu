import { Router } from 'express'
import { register, verifyEmailHandler, login } from './auth.controller.js'
import { validate } from '@middleware/validate.middleware.js'
import { registerSchema, verifyEmailSchema, loginSchema } from './auth.validation.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/verify-email', validate(verifyEmailSchema), verifyEmailHandler)
router.post('/login', validate(loginSchema), login)

export default router
