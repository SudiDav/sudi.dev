import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

describe('comment actor identities', () => {
  beforeEach(() => {
    process.env.COMMENT_HMAC_SECRET = 'test-secret-that-is-at-least-32-characters'
    vi.resetModules()
  })

  it('creates a stable non-reversible key', async () => {
    const { authenticatedActorKey } = await import('./identity')
    const first = authenticatedActorKey('google', 'reader-123')

    expect(authenticatedActorKey('google', 'reader-123')).toBe(first)
    expect(first).not.toContain('reader-123')
  })

  it('namespaces identical subjects by provider', async () => {
    const { authenticatedActorKey } = await import('./identity')

    expect(authenticatedActorKey('google', '123')).not.toBe(
      authenticatedActorKey('github', '123'),
    )
  })

  it('does not retain a guest IP address', async () => {
    const { guestActorKey } = await import('./identity')

    expect(guestActorKey('203.0.113.4')).not.toContain('203.0.113.4')
  })

  it('requires a dedicated high-entropy secret', async () => {
    process.env.COMMENT_HMAC_SECRET = 'short'
    const { guestActorKey } = await import('./identity')

    expect(() => guestActorKey('203.0.113.4')).toThrow(
      'COMMENT_HMAC_SECRET is not configured',
    )
  })
})
