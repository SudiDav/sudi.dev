import 'server-only'
import { createHash } from 'node:crypto'

const GLOBAL_WINDOW_MS = 60_000
const ADDRESS_WINDOW_MS = 10 * 60_000
const GLOBAL_REQUEST_LIMIT = 20
const MAX_ADDRESS_ENTRIES = 200

const acceptedAt: number[] = []
const addressReservations = new Map<string, number>()

/**
 * Reserve a newsletter request before awaiting storage or email providers.
 * This process-local budget is intentionally bounded; provider idempotency
 * deduplicates notices across instances but does not create a shared quota.
 */
export function reserveSubscription(address: string): boolean {
  const now = Date.now()

  while (acceptedAt.length > 0 && now - acceptedAt[0] >= GLOBAL_WINDOW_MS) {
    acceptedAt.shift()
  }
  for (const [digest, expiresAt] of addressReservations) {
    if (expiresAt <= now) addressReservations.delete(digest)
  }

  if (acceptedAt.length >= GLOBAL_REQUEST_LIMIT) return false

  const normalizedAddress = address.trim().toLowerCase()
  const digest = createHash('sha256').update(normalizedAddress).digest('hex')
  if (addressReservations.has(digest) || addressReservations.size >= MAX_ADDRESS_ENTRIES) return false

  addressReservations.set(digest, now + ADDRESS_WINDOW_MS)
  acceptedAt.push(now)
  return true
}
