import { Resend } from 'resend'
import { config } from '@config/env.js'

const resend = new Resend(config.RESEND_API_KEY)

export async function sendVerificationEmail(to: string, link: string) {
  await resend.emails.send({
    from: config.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to,
    subject: 'Verify your NivaranSetu account',
    html: `<p>Click the link below to verify your email:</p><p><a href="${link}">${link}</a></p>`,
  })
}

export async function sendPasswordResetEmail(to: string, link: string) {
  await resend.emails.send({
    from: config.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to,
    subject: 'Reset your NivaranSetu password',
    html: `<p>Click the link below to reset your password:</p><p><a href="${link}">${link}</a></p>`,
  })
}
