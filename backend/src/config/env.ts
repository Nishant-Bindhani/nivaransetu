import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  FRONTEND_URL: z.string().min(1),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  // Resend (email)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // WhatsApp
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),

  // AI Providers
  AI_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  AI_PROVIDER_ORDER: z
    .string()
    .default('null')
    .transform((v) => v.split(',')),
  EMBEDDING_PROVIDER_ORDER: z
    .string()
    .default('null')
    .transform((v) => v.split(',')),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OLLAMA_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),

  // AI Feature Flags
  RAG_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  OCR_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  VISION_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  // Render
  RENDER_BACKEND_URL: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:')
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
