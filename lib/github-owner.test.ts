import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextAuthConfig } from 'next-auth'
import type { OAuthConfig } from 'next-auth/providers'
import type { GitHubProfile } from 'next-auth/providers/github'

let config: NextAuthConfig
vi.mock('next-auth', () => ({
  default: (options: NextAuthConfig | (() => NextAuthConfig)) => {
    config = typeof options === 'function' ? options() : options
    return {}
  },
}))

beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('ADMIN_EMAIL', 'owner@example.com')
  await import('../auth')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function resolveProfile(addresses: unknown[], secondPage?: unknown[]) {
  const request = vi.fn()
    .mockResolvedValueOnce(Response.json({ id: 42, login: 'owner', email: 'public-alias@example.com' }))
    .mockResolvedValueOnce(Response.json(addresses, {
      headers: secondPage ? { link: '<https://api.github.com/user/emails?page=2>; rel="next"' } : {},
    }))
  if (secondPage) request.mockResolvedValueOnce(Response.json(secondPage))
  vi.stubGlobal('fetch', request)
  const factory = config.providers[0]
  const defaults = (typeof factory === 'function' ? factory({}) : factory) as OAuthConfig<GitHubProfile>
  const provider = { ...defaults, ...defaults.options }
  const userinfo = provider.userinfo
  if (!userinfo || typeof userinfo !== 'object' || !userinfo.request) throw Error('Missing profile reader')
  return userinfo.request({ tokens: { access_token: 'test-fixture' }, provider } as Parameters<typeof userinfo.request>[0])
}

describe('GitHub owner sign-in', () => {
  it('keeps a signed-out local admin on the IPv4 preview, including the return path', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('AUTH_URL', 'http://127.0.0.1:3001')
    const authorized = config.callbacks!.authorized!
    const check = (path: string) => authorized({
      auth: null, request: new Request(`http://127.0.0.1:3001${path}`),
    } as Parameters<typeof authorized>[0])
    const response = await check('/admin/posts?status=Draft')
    expect(response).toBeInstanceOf(Response)
    const target = new URL((response as Response).headers.get('location')!)
    expect(target.origin + target.pathname).toBe('http://127.0.0.1:3001/admin/signin')
    expect(target.searchParams.get('callbackUrl')).toBe('/admin/posts?status=Draft')
    expect(await check('/admin/signin')).toBe(false)
  })

  it('uses the verified primary address when the public profile exposes an alias', async () => {
    const profile = await resolveProfile([
      { email: 'public-alias@example.com', primary: false, verified: true },
      { email: 'owner@example.com', primary: true, verified: true },
    ])
    expect(profile.email).toBe('owner@example.com')
  })

  it('finds the configured verified secondary address even when the primary appears first', async () => {
    const profile = await resolveProfile(
      [{ email: 'private-primary@example.com', primary: true, verified: true }],
      [{ email: 'OWNER@example.com', primary: false, verified: true }],
    )
    expect(profile.email).toBe('owner@example.com')
  })

  it('rejects an unverified owner address and unrelated verified addresses', async () => {
    const profile = await resolveProfile([
      { email: 'owner@example.com', primary: true, verified: false },
      { email: 'secondary@example.com', primary: false, verified: true },
    ])
    expect(profile.email).toBeNull()
  })

  it('finds the primary address when GitHub paginates the response', async () => {
    const profile = await resolveProfile(
      [{ email: 'alias@example.com', primary: false, verified: true }],
      [{ email: 'owner@example.com', primary: true, verified: true }],
    )
    expect(profile.email).toBe('owner@example.com')
  })

  it('reads the owner allowlist at request time and rejects an unset owner', () => {
    vi.stubEnv('ADMIN_EMAIL', 'new-owner@example.com')
    const authorized = config.callbacks!.authorized!
    const check = (email?: string) => authorized({ auth: email ? {user: {email}, expires: ''} : null } as Parameters<typeof authorized>[0])
    expect(check('new-owner@example.com')).toBe(true)
    expect(check('owner@example.com')).toBe(false)
    vi.stubEnv('ADMIN_EMAIL', '')
    expect(check()).toBe(false)
  })
})
