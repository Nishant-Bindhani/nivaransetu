import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { config } from '@config/env.js'
import { errorHandler } from '@middleware/errorHandler.middleware.js'
import { apiRateLimit } from '@middleware/rateLimit.middleware.js'
import routes from '@routes/routes.js'

export const app = express()

app.use(helmet())
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  }),
)
app.use(cookieParser())
app.use(express.json())
app.use(apiRateLimit)

app.use('/api', routes)

// error handler must be registered LAST, after all routes
app.use(errorHandler)
