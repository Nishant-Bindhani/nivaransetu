import type { Request, Response, NextFunction } from 'express'
import { AppError } from '@utils/AppError.js'
import { errorResponse } from '@utils/apiResponse.js'
import { logger } from '@utils/logger.js'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn({ err, path: req.path, method: req.method }, err.message)
    res.status(err.statusCode).json(errorResponse(err.message))
    return
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unexpected error')
  res.status(500).json(errorResponse('Something went wrong'))
}
