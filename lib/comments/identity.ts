import 'server-only'

import { createHmac } from 'node:crypto'

function digest(value: string) {
  const secret = process.env.COMMENT_HMAC_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error('COMMENT_HMAC_SECRET is not configured')
  }

  return createHmac('sha256', secret).update(value).digest('hex')
}

export function authenticatedActorKey(provider: 'google' | 'github', subject: string) {
  return digest(`auth:${provider}:${subject}`)
}

export function guestActorKey(ip: string) {
  return digest(`guest:${ip}`)
}
