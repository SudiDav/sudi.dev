import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  authMock,
  getPostMock,
  headersMock,
  revalidatePathMock,
  submitCommentMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getPostMock: vi.fn(),
  headersMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  submitCommentMock: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/lib/content', () => ({ getPost: getPostMock }))
vi.mock('next/headers', () => ({ headers: headersMock }))
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))
vi.mock('@/lib/comments/identity', () => ({
  authenticatedActorKey: (provider: string, subject: string) => `${provider}:${subject}`,
  guestActorKey: (ip: string) => `guest:${ip}`,
}))
vi.mock('@/lib/comments/service', () => ({
  submitComment: (...args: unknown[]) => submitCommentMock(...args),
}))
vi.mock('@/lib/comments/store', () => ({ neonCommentStore: { kind: 'neon-store' } }))

import { submitArticleComment } from './comment-actions'

function form(overrides: Record<string, string> = {}) {
  const data = new FormData()
  for (const [key, value] of Object.entries({
    articleSlug: 'after-amen',
    parentId: '',
    guestName: '',
    body: 'A thoughtful response.',
    ...overrides,
  })) {
    data.set(key, value)
  }
  return data
}

const post = {
  slug: 'after-amen',
  title: 'After Amen',
  excerpt: 'A reflection.',
  date: '2026-09-07',
  readingTime: '5 min read',
  category: 'Philosophy',
  cover: '/images/blog/after-amen.png',
  featured: false,
  status: 'Published',
  body: 'Article body.',
}

describe('submitArticleComment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPostMock.mockResolvedValue(post)
    headersMock.mockResolvedValue(new Headers({ 'x-forwarded-for': '203.0.113.4, 10.0.0.1' }))
  })

  it('derives an authenticated identity from the session', async () => {
    authMock.mockResolvedValue({
      user: {
        commenterId: 'reader-123',
        provider: 'google',
        name: 'Ada',
        email: 'ada@example.com',
        image: 'https://images.example/ada.png',
      },
      expires: '2026-10-10T10:00:00.000Z',
    })
    submitCommentMock.mockResolvedValue({
      ok: true,
      status: 'published',
      comment: {
        id: '01991c35-a812-7000-8000-000000000001',
        parentId: null,
        authorName: 'Ada',
        authorAvatarUrl: 'https://images.example/ada.png',
        authorType: 'google',
        body: 'A thoughtful response.',
        createdAt: '2026-09-10T10:00:00.000Z',
      },
    })

    const result = await submitArticleComment(null, form({ guestName: 'Imposter' }))

    expect(result).toMatchObject({ ok: true, status: 'published' })
    expect(submitCommentMock).toHaveBeenCalledWith(
      { kind: 'neon-store' },
      expect.objectContaining({
        identity: expect.objectContaining({ type: 'google', subject: 'reader-123', name: 'Ada' }),
        actorKey: 'google:reader-123',
      }),
    )
    expect(revalidatePathMock).toHaveBeenCalledWith('/blog/after-amen')
  })

  it('hashes only the first forwarded address for a guest', async () => {
    authMock.mockResolvedValue(null)
    submitCommentMock.mockResolvedValue({ ok: true, status: 'pending' })

    const result = await submitArticleComment(null, form({ guestName: 'Maya' }))

    expect(result).toEqual({ ok: true, status: 'pending' })
    expect(submitCommentMock).toHaveBeenCalledWith(
      { kind: 'neon-store' },
      expect.objectContaining({
        identity: { type: 'guest', name: 'Maya' },
        actorKey: 'guest:203.0.113.4',
      }),
    )
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('rejects a comment for an article that does not exist', async () => {
    authMock.mockResolvedValue(null)
    getPostMock.mockResolvedValue(null)

    await expect(submitArticleComment(null, form())).resolves.toEqual({
      ok: false,
      message: 'This article cannot accept comments.',
    })
    expect(submitCommentMock).not.toHaveBeenCalled()
  })

  it('returns a retryable message when storage fails', async () => {
    authMock.mockResolvedValue(null)
    submitCommentMock.mockRejectedValue(new Error('database unavailable'))

    await expect(submitArticleComment(null, form({ guestName: 'Maya' }))).resolves.toEqual({
      ok: false,
      message: 'Comments are temporarily unavailable. Please try again.',
    })
  })
})
