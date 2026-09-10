import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

describe('getSql', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL
    vi.resetModules()
  })

  it('fails clearly when DATABASE_URL is missing', async () => {
    const { getSql } = await import('./db')

    expect(() => getSql()).toThrow('DATABASE_URL is not configured')
  })
})
