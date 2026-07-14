import rateLimit from 'express-rate-limit'
import { config } from '@config/env.js'
import { errorResponse } from '@utils/apiResponse.js'

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: errorResponse('Too many requests, please try again later'),
})

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: config.API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: errorResponse('Too many requests, please try again later'),
})
