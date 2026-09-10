import { describe, expect, it } from 'vitest'
import { canSignIn, commentIdentityFromAccount, isAdminEmail } from './auth-policy'

const adminEmail = 'owner@example.com'

describe('canSignIn', () => {
  it('allows a verified Google reader', () => {
    expect(
      canSignIn({
        provider: 'google',
        profile: { email_verified: true },
        userEmail: 'reader@example.com',
        adminEmail,
        devBypassEnabled: false,
      }),
    ).toBe(true)
  })

  it('rejects an unverified Google reader', () => {
    expect(
      canSignIn({
        provider: 'google',
        profile: { email_verified: false },
        userEmail: 'reader@example.com',
        adminEmail,
        devBypassEnabled: false,
      }),
    ).toBe(false)
  })

  it('allows a GitHub reader without making an admin decision', () => {
    expect(
      canSignIn({
        provider: 'github',
        profile: {},
        userEmail: null,
        adminEmail,
        devBypassEnabled: false,
      }),
    ).toBe(true)
  })

  it('allows the development provider only for the configured owner', () => {
    const attempt = {
      provider: 'dev',
      profile: {},
      userEmail: 'OWNER@example.com',
      adminEmail,
      devBypassEnabled: true,
    }

    expect(canSignIn(attempt)).toBe(true)
    expect(canSignIn({ ...attempt, userEmail: 'reader@example.com' })).toBe(false)
    expect(canSignIn({ ...attempt, devBypassEnabled: false })).toBe(false)
  })

  it('rejects unknown providers', () => {
    expect(
      canSignIn({
        provider: 'credentials',
        profile: {},
        userEmail: 'reader@example.com',
        adminEmail,
        devBypassEnabled: false,
      }),
    ).toBe(false)
  })
})

describe('isAdminEmail', () => {
  it('matches the configured owner case-insensitively', () => {
    expect(isAdminEmail(' OWNER@example.com ', adminEmail)).toBe(true)
  })

  it('rejects missing and different addresses', () => {
    expect(isAdminEmail(null, adminEmail)).toBe(false)
    expect(isAdminEmail('reader@example.com', adminEmail)).toBe(false)
    expect(isAdminEmail(adminEmail, undefined)).toBe(false)
  })
})

describe('commentIdentityFromAccount', () => {
  it('creates a provider-qualified reader identity', () => {
    expect(commentIdentityFromAccount('google', 'reader-123')).toEqual({
      provider: 'google',
      subject: 'reader-123',
    })
  })

  it('ignores providers that cannot create reader comments', () => {
    expect(commentIdentityFromAccount('dev', 'owner')).toBeNull()
    expect(commentIdentityFromAccount('google', '')).toBeNull()
  })
})
