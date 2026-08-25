import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createPostBroadcast,
  listNewsletterBroadcasts,
  sendNewsletterBroadcast,
} from './newsletter'
import type { Post } from './content.types'

const broadcastCreateMock = vi.fn()
const broadcastListMock = vi.fn()
const broadcastGetMock = vi.fn()
const broadcastSendMock = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('resend', () => ({
  Resend: class {
    broadcasts = {
      create: (...args: unknown[]) => broadcastCreateMock(...args),
      list: (...args: unknown[]) => broadcastListMock(...args),
      get: (...args: unknown[]) => broadcastGetMock(...args),
      send: (...args: unknown[]) => broadcastSendMock(...args),
    }
  },
}))

const postFixture: Post = {
  slug: 'observability-101',
  title: 'Observability 101',
  excerpt: 'A practical guide to seeing what your systems are doing.',
  date: '2026-08-25',
  readingTime: '5 min read',
  category: 'DevOps',
  cover: 'https://sudi.dev/images/observability.png',
  featured: false,
  status: 'Published',
  body: 'Build useful signals before you need them.',
}

describe('newsletter broadcasts', () => {
  const environment = { ...process.env }

  afterEach(() => {
    process.env = { ...environment }
    vi.clearAllMocks()
  })

  it('creates a draft with the verified sender, audience, content, and unsubscribe token', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.RESEND_AUDIENCE_ID = 'aud_123'
    process.env.EMAIL_FROM = 'contact@sudi.dev'
    broadcastCreateMock.mockResolvedValueOnce({ data: { id: 'br_123' }, error: null })

    const result = await createPostBroadcast(postFixture, 'sha_123')

    expect(result).toEqual({
      ok: true,
      id: 'br_123',
      name: 'sudi.dev post: observability-101 · sha_123',
      created: true,
    })
    expect(broadcastCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceId: 'aud_123',
        from: 'contact@sudi.dev',
        subject: 'New on sudi.dev: Observability 101',
        previewText: postFixture.excerpt,
        send: false,
        html: expect.stringContaining('{{{RESEND_UNSUBSCRIBE_URL}}}'),
        text: expect.stringContaining('Read the post'),
      }),
      { headers: { 'Idempotency-Key': 'sudi-post-newsletter-sha_123' } },
    )
  })

  it('does not include a relative cover path in the email', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.RESEND_AUDIENCE_ID = 'aud_123'
    process.env.EMAIL_FROM = 'contact@sudi.dev'
    broadcastCreateMock.mockResolvedValueOnce({ data: { id: 'br_123' }, error: null })

    await createPostBroadcast({ ...postFixture, cover: '/images/local.png' }, 'sha_123')

    const payload = broadcastCreateMock.mock.calls[0][0] as { html: string }
    expect(payload.html).not.toContain('/images/local.png')
  })

  it('returns a soft error when Resend draft creation fails', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.RESEND_AUDIENCE_ID = 'aud_123'
    process.env.EMAIL_FROM = 'contact@sudi.dev'
    broadcastCreateMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'domain invalid' },
    })

    await expect(createPostBroadcast(postFixture, 'sha_123')).resolves.toEqual({
      ok: false,
      error: 'domain invalid',
    })
  })

  it('lists only sudi.dev newsletter broadcasts', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    broadcastListMock.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'br_123',
            name: 'sudi.dev post: observability-101 · sha_123',
            status: 'draft',
            created_at: '2026-08-25T09:00:00.000Z',
          },
          { id: 'br_other', name: 'Other campaign', status: 'draft', created_at: '2026-08-25T08:00:00.000Z' },
        ],
        has_more: false,
      },
      error: null,
    })

    await expect(listNewsletterBroadcasts()).resolves.toEqual({
      ok: true,
      broadcasts: [
        {
          id: 'br_123',
          name: 'sudi.dev post: observability-101 · sha_123',
          status: 'draft',
          createdAt: '2026-08-25T09:00:00.000Z',
        },
      ],
    })
  })

  it('refuses to send a broadcast that is not still a draft', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    broadcastGetMock.mockResolvedValueOnce({
      data: { id: 'br_123', status: 'sent' },
      error: null,
    })

    await expect(sendNewsletterBroadcast('br_123')).resolves.toEqual({
      ok: false,
      error: 'This newsletter has already been sent.',
    })
    expect(broadcastSendMock).not.toHaveBeenCalled()
  })

  it('sends a draft after confirming it is still sendable', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    broadcastGetMock.mockResolvedValueOnce({
      data: { id: 'br_123', name: 'sudi.dev post: observability-101 · sha_123', status: 'draft' },
      error: null,
    })
    broadcastSendMock.mockResolvedValueOnce({ data: { id: 'br_123' }, error: null })

    await expect(sendNewsletterBroadcast('br_123')).resolves.toEqual({ ok: true, id: 'br_123' })
    expect(broadcastSendMock).toHaveBeenCalledWith('br_123')
  })

  it('refuses to send a broadcast that does not belong to sudi.dev', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    broadcastGetMock.mockResolvedValueOnce({
      data: { id: 'br_other', name: 'Other campaign', status: 'draft' },
      error: null,
    })

    await expect(sendNewsletterBroadcast('br_other')).resolves.toEqual({
      ok: false,
      error: 'This newsletter does not belong to sudi.dev.',
    })
    expect(broadcastSendMock).not.toHaveBeenCalled()
  })
})
