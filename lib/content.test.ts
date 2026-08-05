import { describe, it, expect } from 'vitest'
import { getPosts, getPost, getProjects, getProject } from './content'

describe('getPosts', () => {
  it('returns every post in the content directory', async () => {
    expect((await getPosts()).length).toBe(7)
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
    expect(post.title).toBe('Building a Real-Time Collaboration Engine from Scratch')
    expect(post.readingTime).toBe('12 min read')
    expect(post.body.length).toBeGreaterThan(0)
  })
})

describe('getPost', () => {
  it('resolves a known slug', async () => {
    const post = await getPost('building-a-real-time-collaboration-engine-from-scratch')
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
    expect((await getProjects()).length).toBe(6)
  })

  it('sorts by year descending', async () => {
    const years = (await getProjects()).map((p) => p.year)
    expect([...years].sort().reverse()).toEqual(years)
  })

  it('parses tech as an array', async () => {
    const project = await getProject('nexus-cli')
    expect(project?.tech).toEqual(['Rust', 'CLI', 'WASM'])
  })
})
