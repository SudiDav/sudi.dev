import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { getPosts, getPost, getProjects } from './content'

/**
 * Counts come from the content directory rather than a literal, so adding a
 * post or project does not fail an unrelated assertion. The point of these
 * tests is that the loader surfaces everything on disk, not that the seed
 * happens to be a particular size.
 */
const countMdx = async (dir: string) =>
  (await readdir(join(process.cwd(), 'content', dir))).filter((f) => f.endsWith('.mdx')).length

describe('getPosts', () => {
  it('returns every post in the content directory', async () => {
    expect((await getPosts()).length).toBe(await countMdx('posts'))
  })

  it('sorts newest first', async () => {
    const dates = (await getPosts()).map((p) => p.date)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('marks exactly one post as featured', async () => {
    expect((await getPosts()).filter((p) => p.featured)).toHaveLength(1)
  })

  it('parses frontmatter into every field the page renders', async () => {
    // Shape, not values — editing a post through the admin must not fail CI.
    for (const post of await getPosts()) {
      expect(post.title.trim()).not.toBe('')
      expect(post.excerpt.trim()).not.toBe('')
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(post.readingTime).toMatch(/^\d+ min read$/)
      expect(post.category.trim()).not.toBe('')
      expect(post.cover.startsWith('/')).toBe(true)
      expect(post.body.length).toBeGreaterThan(0)
    }
  })
})

describe('getPost', () => {
  it('resolves a known slug', async () => {
    const [first] = await getPosts()
    const post = await getPost(first.slug)
    expect(post?.slug).toBe(first.slug)
  })

  it('returns null for an unknown slug', async () => {
    expect(await getPost('does-not-exist')).toBeNull()
  })

  it('returns null rather than escaping the content directory', async () => {
    expect(await getPost('../../package')).toBeNull()
  })
})

describe('getProjects', () => {
  it('returns every project', async () => {
    expect((await getProjects()).length).toBe(await countMdx('projects'))
  })

  it('sorts by year descending', async () => {
    const years = (await getProjects()).map((p) => p.year)
    expect([...years].sort().reverse()).toEqual(years)
  })

  it('parses tech as an array of non-empty strings', async () => {
    // Asserts the shape, never the contents. Pinning the exact list meant that
    // editing a project's tech stack through the admin failed CI — the tests
    // are here to catch broken parsing, not to freeze the content.
    for (const project of await getProjects()) {
      expect(Array.isArray(project.tech)).toBe(true)
      for (const entry of project.tech) {
        expect(typeof entry).toBe('string')
        expect(entry.trim()).not.toBe('')
      }
    }
  })

  it('gives every project the fields the cards render', async () => {
    for (const project of await getProjects()) {
      expect(project.title.trim()).not.toBe('')
      expect(project.year).toMatch(/^\d{4}$/)
      expect(project.category.trim()).not.toBe('')
      expect(project.cover.startsWith('/')).toBe(true)
    }
  })
})
