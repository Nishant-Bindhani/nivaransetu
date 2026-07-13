import { Router } from 'express'
import { register, verifyEmailHandler } from './auth.controller.js'
import { validate } from '@middleware/validate.middleware.js'
import { registerSchema, verifyEmailSchema } from './auth.validation.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/verify-email', validate(verifyEmailSchema), verifyEmailHandler)

export default router
