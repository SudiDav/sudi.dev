import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { getPosts, getPost, getProjects, getProject } from './content'

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

  it('parses frontmatter into every field', async () => {
    const post = (await getPosts()).find((p) => p.featured)!
    expect(post.title).toBe('Maybe Love Is the Now')
    expect(post.readingTime).toBe('5 min read')
    expect(post.body.length).toBeGreaterThan(0)
  })
})

describe('getPost', () => {
  it('resolves a known slug', async () => {
    const post = await getPost('maybe-love-is-the-now')
    expect(post?.featured).toBe(true)
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

  it('parses tech as an array', async () => {
    const project = await getProject('auction-car')
    expect(project?.tech).toEqual(['.NET', 'RabbitMQ', 'Docker', 'Kubernetes'])
  })
})
