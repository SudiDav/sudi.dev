import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Post } from './content.types'

const { generateCompletionMock, getSettingsMock, getPostsMock, createPostMock, findPostMock } = vi.hoisted(() => ({
  generateCompletionMock: vi.fn(),
  getSettingsMock: vi.fn(),
  getPostsMock: vi.fn(),
  createPostMock: vi.fn(),
  findPostMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('./ai-provider', () => ({ generateCompletion: (...args: unknown[]) => generateCompletionMock(...args) }))
vi.mock('./site', () => ({ getSettings: (...args: unknown[]) => getSettingsMock(...args) }))
vi.mock('./content', () => ({ getPosts: (...args: unknown[]) => getPostsMock(...args) }))
vi.mock('./publish', () => ({
  createPost: (...args: unknown[]) => createPostMock(...args),
  findPostByGeneratedWeek: (...args: unknown[]) => findPostMock(...args),
  slugify: (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
}))

import {
  buildWeeklyPrompt,
  generateWeeklyArticleDraft,
  getISOWeekKey,
  parseGeneratedArticle,
} from './weekly-article'

const settings = {
  displayName: 'Sudi',
  avatar: '/images/sudi.jpeg',
  email: 'contact@sudi.dev',
  bio: 'I build software for institutions and African businesses.',
  location: 'Lubumbashi, DRC',
  website: 'sudi.dev',
  social: { github: 'github.com/SudiDav', twitter: '@Sudi_Dav', linkedin: 'linkedin.com/in/sudidav' },
  seo: { title: 'Sudi', description: 'Engineer' },
  writingProfile: { interests: 'Digital public services', styleGuidance: 'Warm, direct, practical, with personal examples.' },
}

const validArticle = {
  title: 'Building Useful Public Services',
  excerpt: 'A practical look at software that serves people.',
  category: 'Craft',
  body: 'Good public services begin by understanding the people who use them.',
}

const post = (overrides: Partial<Post> = {}): Post => ({
  slug: 'sample',
  title: 'Sample article',
  excerpt: 'Sample excerpt',
  date: '2026-09-01',
  readingTime: '1 min read',
  category: 'Craft',
  cover: '/images/sudi.jpeg',
  featured: false,
  body: 'Published sample body.',
  ...overrides,
})

describe('weekly article helpers', () => {
  it('calculates ISO weeks around the Sunday and Monday boundary', () => {
    expect(getISOWeekKey(new Date('2026-10-11T23:59:00Z'))).toBe('2026-W41')
    expect(getISOWeekKey(new Date('2026-10-12T00:00:00Z'))).toBe('2026-W42')
    expect(getISOWeekKey(new Date('2026-10-12T06:00:00Z'))).toBe('2026-W42')
  })

  it('parses only a complete supported article response', () => {
    expect(parseGeneratedArticle(JSON.stringify(validArticle))).toEqual(validArticle)
  })

  it('rejects unsupported categories and blank required fields', () => {
    expect(() => parseGeneratedArticle(JSON.stringify({ ...validArticle, category: 'Technology' }))).toThrow(/category/i)
    expect(() => parseGeneratedArticle(JSON.stringify({ ...validArticle, title: '  ' }))).toThrow(/title/i)
    expect(() => parseGeneratedArticle(JSON.stringify({ ...validArticle, body: '' }))).toThrow(/body/i)
  })

  it('rejects unknown fields such as a model-supplied Published status', () => {
    expect(() => parseGeneratedArticle(JSON.stringify({ ...validArticle, status: 'Published' }))).toThrow(/unexpected/i)
  })

  it('rejects a body above the configured word limit', () => {
    const oversized = { ...validArticle, body: Array.from({ length: 1_601 }, () => 'word').join(' ') }
    expect(() => parseGeneratedArticle(JSON.stringify(oversized))).toThrow(/1,600/)
  })

  it('uses the site bio when the writing profile and article examples are empty', () => {
    const prompt = buildWeeklyPrompt({ ...settings, writingProfile: { interests: '', styleGuidance: '' } }, [])

    expect(prompt.user).toContain(settings.bio)
    expect(prompt.system).toContain('Do not invent citations')
    expect(prompt.system).toContain('fact-checked')
    expect(prompt.user).toContain('No published examples are available')
  })

  it('uses recent published examples and excludes drafts and archived posts', () => {
    const draftsAndPublished = [
      post({ slug: 'draft', title: 'Private draft', status: 'Draft', body: 'DRAFT SAMPLE' }),
      post({ slug: 'archive', title: 'Archived article', status: 'Archived', body: 'ARCHIVE SAMPLE' }),
      post({ slug: 'legacy', title: 'Legacy published article', status: undefined, body: 'LEGACY SAMPLE' }),
      post({ slug: 'published', title: 'Recent published article', status: 'Published', body: 'PUBLISHED SAMPLE' }),
    ]
    const prompt = buildWeeklyPrompt(settings, draftsAndPublished)

    expect(prompt.user).toContain('LEGACY SAMPLE')
    expect(prompt.user).toContain('PUBLISHED SAMPLE')
    expect(prompt.user).not.toContain('DRAFT SAMPLE')
    expect(prompt.user).not.toContain('ARCHIVE SAMPLE')
    expect(prompt.user).toContain('Recent published article')
  })

  it('limits style examples to three and truncates each body', () => {
    const longBody = 'x'.repeat(3_100)
    const prompt = buildWeeklyPrompt(settings, [
      post({ slug: 'one', title: 'One', date: '2026-09-04', body: longBody }),
      post({ slug: 'two', title: 'Two', date: '2026-09-03', body: 'Two body' }),
      post({ slug: 'three', title: 'Three', date: '2026-09-02', body: 'Three body' }),
      post({ slug: 'four', title: 'Four', date: '2026-09-01', body: 'Fourth body' }),
    ])

    expect(prompt.user).toContain('x'.repeat(3_000))
    expect(prompt.user).not.toContain('x'.repeat(3_001))
    expect(prompt.user).not.toContain('Fourth body')
  })
})

describe('generateWeeklyArticleDraft', () => {
  beforeEach(() => {
    getSettingsMock.mockResolvedValue(settings)
    getPostsMock.mockResolvedValue([])
    findPostMock.mockResolvedValue(null)
    generateCompletionMock.mockResolvedValue(JSON.stringify(validArticle))
    createPostMock.mockImplementation(async (slug: string, draft: Omit<Post, 'slug'>) => ({
      target: 'github',
      status: draft.status,
      post: { ...draft, slug },
    }))
  })

  afterEach(() => vi.clearAllMocks())

  it('creates a validated Draft with a stable ISO week key and reading time', async () => {
    const now = new Date('2026-10-12T06:00:00Z')
    const result = await generateWeeklyArticleDraft(now)

    expect(result).toMatchObject({
      created: true,
      post: {
        slug: 'weekly-2026-w42-building-useful-public-services',
        date: '2026-10-12',
        readingTime: '1 min read',
        status: 'Draft',
        generatedWeek: '2026-W42',
        category: 'Craft',
        body: validArticle.body,
        featured: false,
        cover: '/images/sudi.jpeg',
      },
    })
    expect(generateCompletionMock).toHaveBeenCalledWith(expect.objectContaining({
      maxOutputTokens: 3_500,
    }))
    expect(createPostMock).toHaveBeenCalledOnce()
  })

  it('reuses a same-week draft without calling the model or creating another post', async () => {
    const existing = post({ generatedWeek: '2026-W42', status: 'Draft' })
    findPostMock.mockResolvedValueOnce(existing)

    await expect(generateWeeklyArticleDraft(new Date('2026-10-12T06:00:00Z'))).resolves.toEqual({
      post: existing,
      created: false,
    })
    expect(generateCompletionMock).not.toHaveBeenCalled()
    expect(createPostMock).not.toHaveBeenCalled()
  })

  it('does not create a post when the provider fails or returns invalid content', async () => {
    generateCompletionMock.mockRejectedValueOnce(new Error('provider unavailable'))
    await expect(generateWeeklyArticleDraft(new Date('2026-10-12T06:00:00Z'))).rejects.toThrow('provider unavailable')
    expect(createPostMock).not.toHaveBeenCalled()

    generateCompletionMock.mockResolvedValueOnce(JSON.stringify({ ...validArticle, status: 'Published' }))
    await expect(generateWeeklyArticleDraft(new Date('2026-10-12T06:00:00Z'))).rejects.toThrow(/unexpected/i)
    expect(createPostMock).not.toHaveBeenCalled()
  })

  it('surfaces GitHub creation failures without returning a draft', async () => {
    createPostMock.mockRejectedValueOnce(new Error('GitHub write failed'))

    await expect(generateWeeklyArticleDraft(new Date('2026-10-12T06:00:00Z'))).rejects.toThrow('GitHub write failed')
  })
})
