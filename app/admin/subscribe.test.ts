import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

const { contactMock, sendMock } = vi.hoisted(() => ({ contactMock: vi.fn(), sendMock: vi.fn() }))
vi.mock('resend', () => ({ Resend: class { contacts = { create: contactMock }; emails = { send: sendMock } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/auth', () => ({ isAdmin: vi.fn() }))
vi.mock('@/lib/newsletter', () => ({ createPostBroadcast: vi.fn(), listNewsletterBroadcasts: vi.fn(), sendNewsletterBroadcast: vi.fn() }))
vi.mock('@/lib/publish', () => ({
  savePost: vi.fn(), createPost: vi.fn(), createProject: vi.fn(), saveProject: vi.fn(), saveSettings: vi.fn(),
  slugify: vi.fn(), PostSaveError: Error, uploadImage: vi.fn(),
}))

describe('public subscription admission and notifications', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T12:00:00Z'))
    vi.stubEnv('RESEND_API_KEY', 're_fixture')
    vi.stubEnv('RESEND_AUDIENCE_ID', 'aud_fixture')
    vi.stubEnv('CONTACT_EMAIL', 'owner@example.com')
    contactMock.mockReset().mockResolvedValue({ error: null })
    sendMock.mockReset().mockResolvedValue({ error: null })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

  it('never sends a signup notice when the audience rejects storage', async () => {
    const { subscribe } = await import('./actions')
    contactMock.mockResolvedValue({ error: { message: 'storage unavailable' } })
    expect(await subscribe('reader@example.com')).toMatchObject({ ok: false })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('blocks repeated normalized addresses before issuing provider requests', async () => {
    const { subscribe } = await import('./actions')
    expect(await subscribe(' Reader@Example.com ')).toMatchObject({ ok: true })
    expect(await subscribe('reader@example.com')).toMatchObject({ ok: false })
    expect(contactMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('reserves admission before storage awaits so concurrent retries cannot send twice', async () => {
    const { subscribe } = await import('./actions')
    let complete!: (result: { error: null }) => void
    contactMock.mockReturnValueOnce(new Promise(resolve => { complete = resolve }))
    const first = subscribe('reader@example.com')
    expect(await subscribe('reader@example.com')).toMatchObject({ ok: false })
    expect(sendMock).not.toHaveBeenCalled()
    complete({ error: null })
    expect(await first).toMatchObject({ ok: true })
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('bounds requests using different addresses before they consume provider capacity', async () => {
    const { subscribe } = await import('./actions')
    for (let index = 0; index < 20; index++) {
      expect(await subscribe(`reader${index}@example.com`)).toMatchObject({ ok: true })
    }
    expect(await subscribe('overflow@example.com')).toMatchObject({ ok: false })
    expect(contactMock).toHaveBeenCalledTimes(20)
    expect(sendMock).toHaveBeenCalledTimes(20)
  })

  it('rejects malformed or oversized action payloads without throwing or sending', async () => {
    const { subscribe } = await import('./actions')
    expect(await subscribe(null as unknown as string)).toMatchObject({ ok: false })
    expect(await subscribe('x'.repeat(255) + '@example.com')).toMatchObject({ ok: false })
    expect(contactMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('keeps a stored subscription successful when the owner notice fails', async () => {
    const { subscribe } = await import('./actions')
    sendMock.mockRejectedValue(new Error('notification down'))
    expect(await subscribe('reader@example.com')).toMatchObject({ ok: true, warning: expect.any(String) })
    expect(contactMock).toHaveBeenCalledTimes(1)
  })
})
