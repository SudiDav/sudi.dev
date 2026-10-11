import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { generateDraftMock, notifyDraftMock } = vi.hoisted(() => ({
  generateDraftMock: vi.fn(),
  notifyDraftMock: vi.fn(),
}))

vi.mock('@/lib/weekly-article', () => ({
  generateWeeklyArticleDraft: (...args: unknown[]) => generateDraftMock(...args),
}))
vi.mock('@/lib/email', () => ({
  notifyWeeklyDraft: (...args: unknown[]) => notifyDraftMock(...args),
}))

import { GET } from './route'

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

describe('weekly article cron route', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'a-secure-test-cron-secret')
    generateDraftMock.mockResolvedValue({ post, created: true })
    notifyDraftMock.mockResolvedValue({ sent: true })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('fails closed when the secret is unset or authorization is incorrect', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const unset = await GET(new Request('https://sudi.dev/api/cron/weekly-article', {
      headers: { Authorization: 'Bearer a-secure-test-cron-secret' },
    }))
    expect(unset.status).toBe(401)
    expect(unset.headers.get('Cache-Control')).toBe('no-store')

    vi.stubEnv('CRON_SECRET', 'a-secure-test-cron-secret')
    const incorrect = await GET(new Request('https://sudi.dev/api/cron/weekly-article', {
      headers: { Authorization: 'Bearer wrong-secret' },
    }))
    expect(incorrect.status).toBe(401)
    expect(generateDraftMock).not.toHaveBeenCalled()
    expect(notifyDraftMock).not.toHaveBeenCalled()
  })

  it('generates and emails the draft for an authorized request', async () => {
    const response = await GET(new Request('https://sudi.dev/api/cron/weekly-article', {
      headers: { Authorization: 'Bearer a-secure-test-cron-secret' },
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      ok: true,
      slug: post.slug,
      created: true,
      emailSent: true,
    })
    expect(generateDraftMock).toHaveBeenCalledOnce()
    expect(notifyDraftMock).toHaveBeenCalledWith(post)
  })

  it('returns a server error when generation fails', async () => {
    generateDraftMock.mockRejectedValueOnce(new Error('provider failed'))
    const response = await GET(new Request('https://sudi.dev/api/cron/weekly-article', {
      headers: { Authorization: 'Bearer a-secure-test-cron-secret' },
    }))

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(notifyDraftMock).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
  })

  it('keeps the generated draft successful when owner email delivery fails', async () => {
    notifyDraftMock.mockResolvedValueOnce({ sent: false, reason: 'Resend unavailable' })
    const response = await GET(new Request('https://sudi.dev/api/cron/weekly-article', {
      headers: { Authorization: 'Bearer a-secure-test-cron-secret' },
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ ok: true, slug: post.slug, emailSent: false })
    expect(console.error).toHaveBeenCalledWith('Weekly article draft notification failed.', expect.objectContaining({
      slug: post.slug,
      reason: 'Resend unavailable',
    }))
  })
})
