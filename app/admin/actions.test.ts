import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Post } from '@/lib/content.types'

const {
  isAdminMock,
  createPostMock,
  savePostMock,
  newsletterMock,
  listMock,
  sendMock,
  audienceListMock,
  saveSettingsMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  isAdminMock: vi.fn(),
  createPostMock: vi.fn(),
  savePostMock: vi.fn(),
  newsletterMock: vi.fn(),
  listMock: vi.fn(),
  sendMock: vi.fn(),
  audienceListMock: vi.fn(),
  saveSettingsMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('@/auth', () => ({ isAdmin: isAdminMock }))
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))
vi.mock('@/lib/email', () => ({
  addToAudience: vi.fn(),
  notifyNewSubscriber: vi.fn(),
  subscriptionOutcome: vi.fn(),
  listAudienceContacts: (...args: unknown[]) => audienceListMock(...args),
}))
vi.mock('@/lib/publish', () => ({
  PostSaveError: class extends Error {
    constructor(public readonly code: string, message: string) { super(message) }
  },
  createPost: (...args: unknown[]) => createPostMock(...args),
  savePost: (...args: unknown[]) => savePostMock(...args),
  createProject: vi.fn(),
  saveProject: vi.fn(),
  saveSettings: (...args: unknown[]) => saveSettingsMock(...args),
  slugify: (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  uploadImage: vi.fn(),
}))
vi.mock('@/lib/newsletter', () => ({
  createPostBroadcast: (...args: unknown[]) => newsletterMock(...args),
  listNewsletterBroadcasts: (...args: unknown[]) => listMock(...args),
  sendNewsletterBroadcast: (...args: unknown[]) => sendMock(...args),
}))

import { addPost, listNewsletters, listSubscribers, publishReviewedPost, sendNewsletter, updatePost, updateSettings } from './actions'

const postFixture: Post = {
  slug: 'hello',
  title: 'Hello',
  excerpt: 'A short post.',
  date: '2026-08-25',
  readingTime: '1 min read',
  category: 'DevOps',
  cover: '/images/hello.png',
  featured: false,
  status: 'Published',
  body: 'Hello world.',
}

const postInput = {
  title: 'Hello',
  excerpt: 'A short post.',
  body: 'Hello world.',
  category: 'DevOps',
  cover: '/images/hello.png',
}

describe('post newsletter integration', () => {
  beforeEach(() => {
    isAdminMock.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('creates a newsletter draft when a saved post is published after review', async () => {
    savePostMock.mockResolvedValueOnce({
      target: 'github',
      sha: 'sha_123',
      branch: 'main',
      previousStatus: 'Draft',
      status: 'Published',
      post: postFixture,
    })
    newsletterMock.mockResolvedValueOnce({
      ok: true,
      id: 'br_123',
      name: 'sudi.dev post: hello · sha_123',
      created: true,
    })

    const result = await publishReviewedPost('hello', 'reviewed-source-version')

    expect(result).toMatchObject({ ok: true, newsletter: { ok: true, id: 'br_123' } })
    expect(newsletterMock).toHaveBeenCalledWith(postFixture, 'sha_123')
  })

  it('does not create a draft when creating a Draft post', async () => {
    createPostMock.mockResolvedValueOnce({
      target: 'github',
      sha: 'sha_draft',
      branch: 'main',
      status: 'Draft',
      post: { ...postFixture, status: 'Draft' },
    })

    await addPost({ ...postInput, status: 'Draft' })

    expect(newsletterMock).not.toHaveBeenCalled()
  })

  it('does not create another draft when editing an already Published post', async () => {
    savePostMock.mockResolvedValueOnce({
      target: 'github',
      sha: 'sha_edit',
      branch: 'main',
      previousStatus: 'Published',
      status: 'Published',
      post: postFixture,
    })

    await updatePost('hello', { ...postInput, status: 'Published' }, 'reviewed-source-version')

    expect(newsletterMock).not.toHaveBeenCalled()
  })

  it('keeps publishing successful when newsletter draft creation fails', async () => {
    savePostMock.mockResolvedValueOnce({
      target: 'github',
      sha: 'sha_123',
      branch: 'main',
      previousStatus: 'Draft',
      status: 'Published',
      post: postFixture,
    })
    newsletterMock.mockResolvedValueOnce({ ok: false, error: 'domain invalid' })

    const result = await publishReviewedPost('hello', 'reviewed-source-version')

    expect(result).toMatchObject({ ok: true, publish: { sha: 'sha_123' } })
    expect(result).toMatchObject({ newsletter: { ok: false, error: 'domain invalid' } })
  })

  it('rejects newsletter listing for a non-admin', async () => {
    isAdminMock.mockResolvedValueOnce(false)

    await expect(listNewsletters()).rejects.toThrow('Not authorised')
    expect(listMock).not.toHaveBeenCalled()
  })

  it('lists newsletters for an authenticated admin', async () => {
    listMock.mockResolvedValueOnce({ ok: true, broadcasts: [] })

    await expect(listNewsletters()).resolves.toEqual({ ok: true, broadcasts: [] })
    expect(listMock).toHaveBeenCalledOnce()
  })

  it('rejects subscriber listing for a non-admin', async () => {
    isAdminMock.mockResolvedValueOnce(false)

    await expect(listSubscribers()).rejects.toThrow('Not authorised')
    expect(audienceListMock).not.toHaveBeenCalled()
  })

  it('lists subscribers for an authenticated admin', async () => {
    audienceListMock.mockResolvedValueOnce({
      ok: true,
      contacts: [
        {
          id: 'ct_123',
          email: 'reader@example.com',
          createdAt: '2026-08-25T12:00:00.000Z',
          unsubscribed: false,
        },
      ],
      hasMore: false,
    })

    await expect(listSubscribers()).resolves.toEqual({
      ok: true,
      contacts: [
        {
          id: 'ct_123',
          email: 'reader@example.com',
          createdAt: '2026-08-25T12:00:00.000Z',
          unsubscribed: false,
        },
      ],
      hasMore: false,
    })
    expect(audienceListMock).toHaveBeenCalledOnce()
  })

  it('sends a newsletter and revalidates the admin page', async () => {
    sendMock.mockResolvedValueOnce({ ok: true, id: 'br_123' })

    await expect(sendNewsletter('br_123')).resolves.toEqual({ ok: true, id: 'br_123' })
    expect(sendMock).toHaveBeenCalledWith('br_123')
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/newsletters')
  })
})

describe('updateSettings', () => {
  beforeEach(() => {
    isAdminMock.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('passes the writing profile unchanged to the settings publisher', async () => {
    const settings = {
      displayName: 'Sudi',
      avatar: '/images/sudi.jpeg',
      email: 'sudi@example.com',
      bio: 'Engineer',
      location: 'Lubumbashi',
      website: 'sudi.dev',
      social: { github: 'github.com/SudiDav', twitter: '', linkedin: '', instagram: '' },
      seo: { title: 'Sudi', description: 'Engineer' },
      writingProfile: { interests: 'Public services', styleGuidance: 'Clear and practical' },
    }
    saveSettingsMock.mockResolvedValueOnce({ target: 'github', sha: 'settings_sha', branch: 'main' })

    await expect(updateSettings(settings)).resolves.toMatchObject({ ok: true })
    expect(saveSettingsMock).toHaveBeenCalledWith(settings, 'content: update site settings')
  })
})
