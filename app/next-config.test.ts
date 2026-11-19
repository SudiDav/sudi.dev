import { afterEach, describe, expect, it, vi } from 'vitest'
import nextConfig from '../next.config'

describe('server action upload configuration', () => {
  it('allows the cover upload component to accept its 5MB file limit', () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe('6mb')
  })
})

describe('local GitHub callback origin', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it.each([
    ['development', 'http://127.0.0.1:3001', true],
    ['development', 'http://localhost:3000', false],
    ['production', 'https://sudi.dev', false],
  ] as const)('preserves the literal loopback only when configured (%s, %s)', async (mode, origin, preserve) => {
    vi.stubEnv('NODE_ENV', mode)
    vi.stubEnv('AUTH_URL', origin)
    vi.resetModules()
    const { default: config } = await import('../next.config')
    expect(config.skipProxyUrlNormalize).toBe(preserve)
  })
})
