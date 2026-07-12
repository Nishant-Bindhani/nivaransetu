import { Router } from 'express'
import authRouter from '@modules/auth/auth.router.js'

const routes = Router()

routes.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

routes.use('/v1/auth', authRouter)

export default routes
