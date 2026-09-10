import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Post, Project } from './content.types'

const getPosts = vi.fn()
const getProjects = vi.fn()
const getAdminCommentCount = vi.fn()
const getPostViewCounts = vi.fn()

vi.mock('./content', () => ({ getPosts, getProjects }))
vi.mock('./admin-comments', () => ({ getAdminCommentCount }))
vi.mock('./vercel-analytics', () => ({
  getPostViewCounts,
  formatViewCount: (value: number) => new Intl.NumberFormat('en-US').format(value),
}))

const posts = [
  { slug: 'first-post', title: 'First', category: 'Craft', date: '2026-09-01', status: 'Published' },
  { slug: 'second-post', title: 'Second', category: 'Life', date: '2026-08-01', status: 'Draft' },
] as Post[]

beforeEach(() => {
  vi.clearAllMocks()
  getPosts.mockResolvedValue(posts)
  getProjects.mockResolvedValue([] as Project[])
  getAdminCommentCount.mockResolvedValue({ count: 0, error: null })
  getPostViewCounts.mockResolvedValue({ counts: { 'first-post': 1234, 'second-post': 3 }, available: true })
})

describe('admin analytics data', () => {
  it('maps Vercel page views into the Posts table and keeps status counts', async () => {
    const { getAdminPosts, getAdminPostCounts } = await import('./admin-data')
    const adminPosts = await getAdminPosts()

    expect(adminPosts.map((post) => ({ title: post.title, views: post.views }))).toEqual([
      { title: 'First', views: '1,234' },
      { title: 'Second', views: '3' },
    ])
    expect(await getAdminPostCounts(adminPosts)).toEqual([
      { label: 'All Posts', value: '2' },
      { label: 'Published', value: '1' },
      { label: 'Drafts', value: '1' },
      { label: 'Archived', value: '0' },
    ])
  })

  it('sums only published post views for the dashboard', async () => {
    const { getAdminStats } = await import('./admin-data')
    await expect(getAdminStats()).resolves.toMatchObject({ views: '1,234', viewsPeriod: 'all published posts' })
  })

  it('reports all stored comments on the dashboard', async () => {
    getAdminCommentCount.mockResolvedValue({ count: 14, error: null })
    const { getAdminStats } = await import('./admin-data')

    await expect(getAdminStats()).resolves.toMatchObject({
      comments: '14',
      commentsPeriod: 'all stored comments',
    })
  })

  it('shows an unavailable comment state without inventing a zero', async () => {
    getAdminCommentCount.mockResolvedValue({ count: 0, error: 'Comments are unavailable' })
    const { getAdminStats } = await import('./admin-data')

    await expect(getAdminStats()).resolves.toMatchObject({
      comments: '—',
      commentsPeriod: 'comments unavailable',
    })
  })
})
