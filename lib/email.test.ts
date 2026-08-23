import { describe, it, expect, vi, afterEach } from 'vitest'
import { addToAudience, emailConfigured, notifyNewSubscriber } from './email'

// `emails` is an instance property, so it cannot be spied on via the prototype.
// The module is mocked instead, which also keeps these tests off the network.
const sendMock = vi.fn()
const contactMock = vi.fn()
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => sendMock(...args) }
    contacts = { create: (...args: unknown[]) => contactMock(...args) }
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
})
