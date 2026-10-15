import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  addToAudience,
  emailConfigured,
  listAudienceContacts,
  notifyNewSubscriber,
  notifyWeeklyDraft,
  subscriptionOutcome,
} from './email'

// `emails` is an instance property, so it cannot be spied on via the prototype.
// The module is mocked instead, which also keeps these tests off the network.
const sendMock = vi.fn()
const contactMock = vi.fn()
const contactListMock = vi.fn()
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => sendMock(...args) }
    contacts = {
      create: (...args: unknown[]) => contactMock(...args),
      list: (...args: unknown[]) => contactListMock(...args),
    }
  },
}))

/**
 * The contract that matters: with no provider configured, notifying must fail
 * softly rather than throw. subscribe() has already written the address to disk
 * by the time it calls this, so an exception here would surface as an error to
 * someone who did in fact subscribe.
 */
describe('email', () => {
  const env = { ...process.env }
  afterEach(() => {
    process.env = { ...env }
    vi.restoreAllMocks()
    sendMock.mockReset()
    contactMock.mockReset()
    contactListMock.mockReset()
  })

  it('reports itself unconfigured without an API key', () => {
    delete process.env.RESEND_API_KEY
    expect(emailConfigured()).toBe(false)
  })

  it('does not throw when no API key is set', async () => {
    delete process.env.RESEND_API_KEY
    const result = await notifyNewSubscriber('reader@example.com')
    expect(result.sent).toBe(false)
    expect(result.reason).toMatch(/RESEND_API_KEY/)
  })

  it('does not throw when a recipient is missing', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    delete process.env.CONTACT_EMAIL
    delete process.env.ADMIN_EMAIL
    const result = await notifyNewSubscriber('reader@example.com')
    expect(result.sent).toBe(false)
    expect(result.reason).toMatch(/CONTACT_EMAIL/)
  })

  it('reports a thrown provider error instead of propagating it', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.CONTACT_EMAIL = 'contact@sudi.dev'
    sendMock.mockRejectedValueOnce(new Error('network down'))

    const result = await notifyNewSubscriber('reader@example.com')
    expect(result.sent).toBe(false)
    expect(result.reason).toBe('network down')
  })

  it('reports a provider-returned error', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.CONTACT_EMAIL = 'contact@sudi.dev'
    sendMock.mockResolvedValueOnce({ error: { message: 'domain not verified' } })

    const result = await notifyNewSubscriber('reader@example.com')
    expect(result.sent).toBe(false)
    expect(result.reason).toBe('domain not verified')
  })

  it('sends to CONTACT_EMAIL naming the subscriber', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.CONTACT_EMAIL = 'contact@sudi.dev'
    sendMock.mockResolvedValueOnce({ error: null })

    const result = await notifyNewSubscriber('reader@example.com')
    expect(result.sent).toBe(true)
    const payload = sendMock.mock.calls.at(-1)![0] as Record<string, string>
    expect(payload.to).toBe('contact@sudi.dev')
    expect(payload.subject).toContain('reader@example.com')
    expect(sendMock.mock.calls.at(-1)).toHaveLength(2)
    expect(sendMock.mock.calls.at(-1)![1]).toMatchObject({ idempotencyKey: expect.any(String) })
  })

  it('uses a normalized subscriber address for identical retry payloads and keys', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.CONTACT_EMAIL = 'contact@sudi.dev'
    sendMock.mockResolvedValue({ error: null })

    await notifyNewSubscriber(' Reader@Example.com ')
    await notifyNewSubscriber('reader@example.com')

    expect(sendMock.mock.calls[0][0]).toEqual(sendMock.mock.calls[1][0])
    expect(sendMock.mock.calls[0][1]).toEqual(sendMock.mock.calls[1][1])
    expect(sendMock.mock.calls[0][1].idempotencyKey).not.toContain('reader@example.com')
  })

  it('scopes notification keys to the owner and sender identity', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.CONTACT_EMAIL = 'owner-one@sudi.dev'
    sendMock.mockResolvedValue({ error: null })
    await notifyNewSubscriber('reader@example.com')
    const firstKey = sendMock.mock.calls.at(-1)![1].idempotencyKey

    process.env.CONTACT_EMAIL = 'owner-two@sudi.dev'
    await notifyNewSubscriber('reader@example.com')
    const secondKey = sendMock.mock.calls.at(-1)![1].idempotencyKey

    vi.resetModules()
    process.env.CONTACT_EMAIL = 'owner-one@sudi.dev'
    process.env.EMAIL_FROM = 'Other sender <other@sudi.dev>'
    const { notifyNewSubscriber: notifyFromOtherSender } = await import('./email')
    await notifyFromOtherSender('reader@example.com')
    const thirdKey = sendMock.mock.calls.at(-1)![1].idempotencyKey

    expect(new Set([firstKey, secondKey, thirdKey]).size).toBe(3)
  })

  it('does not throw adding to the audience when unconfigured', async () => {
    delete process.env.RESEND_API_KEY
    const result = await addToAudience('reader@example.com')
    expect(result.sent).toBe(false)
    expect(result.reason).toMatch(/RESEND_API_KEY/)
  })

  it('reports a missing audience id rather than throwing', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    delete process.env.RESEND_AUDIENCE_ID
    const result = await addToAudience('reader@example.com')
    expect(result.sent).toBe(false)
    expect(result.reason).toMatch(/RESEND_AUDIENCE_ID/)
  })

  it('adds a contact to the configured audience', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.RESEND_AUDIENCE_ID = 'aud_123'
    contactMock.mockResolvedValueOnce({ error: null })

    const result = await addToAudience('reader@example.com')
    expect(result.sent).toBe(true)
    expect(contactMock.mock.calls.at(-1)![0]).toMatchObject({
      email: 'reader@example.com',
      audienceId: 'aud_123',
      unsubscribed: false,
    })
  })

  it('lists contacts from the configured audience', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.RESEND_AUDIENCE_ID = 'aud_123'
    contactListMock.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'ct_123',
            email: 'reader@example.com',
            first_name: null,
            last_name: null,
            created_at: '2026-08-25T12:00:00.000Z',
            unsubscribed: false,
          },
        ],
        has_more: true,
      },
      error: null,
    })

    const result = await listAudienceContacts()

    expect(result).toEqual({
      ok: true,
      contacts: [
        {
          id: 'ct_123',
          email: 'reader@example.com',
          createdAt: '2026-08-25T12:00:00.000Z',
          unsubscribed: false,
        },
      ],
      hasMore: true,
    })
    expect(contactListMock).toHaveBeenCalledWith({ audienceId: 'aud_123', limit: 100 })
  })

  it('reports a missing audience id when listing contacts', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    delete process.env.RESEND_AUDIENCE_ID

    const result = await listAudienceContacts()

    expect(result).toEqual({ ok: false, error: 'RESEND_AUDIENCE_ID not set' })
    expect(contactListMock).not.toHaveBeenCalled()
  })

  it('fails the subscription when audience storage fails', () => {
    expect(subscriptionOutcome({ sent: false, reason: 'audience unavailable' }, { sent: true })).toEqual({
      ok: false,
      error: 'We could not save your subscription right now. Please try again.',
    })
  })

  it('keeps a saved subscription successful when the owner notification fails', () => {
    expect(subscriptionOutcome({ sent: true }, { sent: false, reason: 'domain not verified' })).toEqual({
      ok: true,
      warning: 'Subscription saved, but the owner notification could not be sent.',
    })
  })

  it('returns a clean success when both audience and notification succeed', () => {
    expect(subscriptionOutcome({ sent: true }, { sent: true })).toEqual({ ok: true })
  })

  describe('notifyWeeklyDraft', () => {
    const post = {
      slug: 'weekly-2026-w42-public-services',
      title: 'Building Useful Public Services',
      excerpt: 'A practical look at software that serves people.',
      date: '2026-10-12',
      readingTime: '4 min read',
      category: 'Craft',
      cover: '/images/sudi.jpeg',
      featured: false,
      status: 'Draft' as const,
      generatedWeek: '2026-W42',
      body: 'Article body.',
    }

    it('reports missing Resend configuration softly', async () => {
      delete process.env.RESEND_API_KEY
      process.env.CONTACT_EMAIL = 'contact@sudi.dev'

      await expect(notifyWeeklyDraft(post)).resolves.toMatchObject({ sent: false, reason: expect.stringMatching(/RESEND_API_KEY/) })
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('reports a missing owner recipient softly', async () => {
      process.env.RESEND_API_KEY = 're_test_key'
      delete process.env.CONTACT_EMAIL
      delete process.env.ADMIN_EMAIL

      await expect(notifyWeeklyDraft(post)).resolves.toMatchObject({ sent: false, reason: expect.stringMatching(/CONTACT_EMAIL/) })
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('emails the owner a link to edit the saved draft', async () => {
      process.env.RESEND_API_KEY = 're_test_key'
      process.env.CONTACT_EMAIL = 'owner@sudi.dev'
      process.env.ADMIN_EMAIL = 'admin@sudi.dev'
      process.env.EMAIL_FROM = 'Sudi <contact@sudi.dev>'
      sendMock.mockResolvedValueOnce({ error: null })

      await expect(notifyWeeklyDraft(post)).resolves.toEqual({ sent: true })

      expect(sendMock).toHaveBeenCalledWith({
        from: expect.any(String),
        to: 'owner@sudi.dev',
        subject: 'Your weekly article draft: Building Useful Public Services',
        text: expect.stringContaining('https://sudi.dev/admin/posts/weekly-2026-w42-public-services/edit'),
      })
      expect(sendMock.mock.calls[0][0].text).toContain(post.excerpt)
      expect(sendMock.mock.calls[0]).toHaveLength(1)
      expect(contactMock).not.toHaveBeenCalled()
      expect(contactListMock).not.toHaveBeenCalled()
    })

    it('falls back to ADMIN_EMAIL when CONTACT_EMAIL is not set', async () => {
      process.env.RESEND_API_KEY = 're_test_key'
      delete process.env.CONTACT_EMAIL
      process.env.ADMIN_EMAIL = 'admin@sudi.dev'
      sendMock.mockResolvedValueOnce({ error: null })

      await notifyWeeklyDraft(post)

      expect(sendMock.mock.calls[0][0].to).toBe('admin@sudi.dev')
    })

    it('returns provider-reported and thrown errors as soft failures', async () => {
      process.env.RESEND_API_KEY = 're_test_key'
      process.env.CONTACT_EMAIL = 'owner@sudi.dev'
      sendMock.mockResolvedValueOnce({ error: { message: 'domain not verified' } })
      await expect(notifyWeeklyDraft(post)).resolves.toEqual({ sent: false, reason: 'domain not verified' })

      sendMock.mockRejectedValueOnce(new Error('network down'))
      await expect(notifyWeeklyDraft(post)).resolves.toEqual({ sent: false, reason: 'network down' })
      expect(contactMock).not.toHaveBeenCalled()
      expect(contactListMock).not.toHaveBeenCalled()
    })
  })
})
