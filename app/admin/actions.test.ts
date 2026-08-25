import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Post } from '@/lib/content.types'

const {
  isAdminMock,
  createPostMock,
  savePostMock,
  newsletterMock,
  listMock,
  sendMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  isAdminMock: vi.fn(),
  createPostMock: vi.fn(),
  savePostMock: vi.fn(),
  newsletterMock: vi.fn(),
  listMock: vi.fn(),
  sendMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('@/auth', () => ({ isAdmin: isAdminMock }))
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))
vi.mock('@/lib/publish', () => ({
  createPost: (...args: unknown[]) => createPostMock(...args),
  savePost: (...args: unknown[]) => savePostMock(...args),
  createProject: vi.fn(),
  saveProject: vi.fn(),
  saveSettings: vi.fn(),
  slugify: (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  uploadImage: vi.fn(),
}))
vi.mock('@/lib/newsletter', () => ({
  createPostBroadcast: (...args: unknown[]) => newsletterMock(...args),
  listNewsletterBroadcasts: (...args: unknown[]) => listMock(...args),
  sendNewsletterBroadcast: (...args: unknown[]) => sendMock(...args),
}))

import { addPost, listNewsletters, sendNewsletter, updatePost } from './actions'

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

  it('creates a newsletter draft when a new post is published', async () => {
    createPostMock.mockResolvedValueOnce({
      target: 'github',
      sha: 'sha_123',
      branch: 'main',
      status: 'Published',
      post: postFixture,
    })
    newsletterMock.mockResolvedValueOnce({
      ok: true,
      id: 'br_123',
      name: 'sudi.dev post: hello · sha_123',
      created: true,
    })

    const result = await addPost({ ...postInput, status: 'Published' })

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

    await updatePost('hello', { ...postInput, status: 'Published' })

    expect(newsletterMock).not.toHaveBeenCalled()
  })

  it('keeps publishing successful when newsletter draft creation fails', async () => {
    createPostMock.mockResolvedValueOnce({
      target: 'github',
      sha: 'sha_123',
      branch: 'main',
      status: 'Published',
      post: postFixture,
    })
    newsletterMock.mockResolvedValueOnce({ ok: false, error: 'domain invalid' })

    const result = await addPost({ ...postInput, status: 'Published' })

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

  it('sends a newsletter and revalidates the admin page', async () => {
    sendMock.mockResolvedValueOnce({ ok: true, id: 'br_123' })

    await expect(sendNewsletter('br_123')).resolves.toEqual({ ok: true, id: 'br_123' })
    expect(sendMock).toHaveBeenCalledWith('br_123')
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/newsletters')
  })
})
