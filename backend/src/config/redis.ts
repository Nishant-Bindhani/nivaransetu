import { Redis } from 'ioredis'
import { config } from '@config/env.js'

const globalForRedis = global as unknown as { redis: Redis }

export const redis =
  globalForRedis.redis ||
  new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10_000,
    commandTimeout: 5_000,
    keepAlive: 10_000,
    retryStrategy(times) {
      return Math.min(times * 200, 2000)
    },
  })

redis.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Redis connection error:', err.message)
})

if (config.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}
