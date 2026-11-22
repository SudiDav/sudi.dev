import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProjects, getPublishedPost, getPublishedPosts } from './content'

const files = vi.hoisted(() => new Map<string, string>())

vi.mock('node:fs/promises', () => ({
  readdir: async (path: string) => {
    const prefix = path.split('/content/')[1] + '/'
    return [...files.keys()].filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length))
  },
  readFile: async (path: string) => files.get(path.split('/content/')[1]),
}))

function original(status: 'Published' | 'Draft') {
  return [
    '---',
    'title: Source',
    'excerpt: English description',
    'date: "2026-10-11"',
    'readingTime: 1 min read',
    'category: Craft',
    'cover: /images/source.jpg',
    'status: ' + status,
    '---',
    'Original body.',
  ].join('\n')
}

const translation = [
  '---',
  'title: Article traduit',
  'excerpt: Résumé français',
  'readingTime: 1 min de lecture',
  'status: Published',
  '---',
  'Texte traduit.',
].join('\n')

describe('French article visibility', () => {
  beforeEach(() => {
    files.clear()
    files.set('posts/paired.mdx', original('Published'))
    files.set('posts/english-only.mdx', original('Published'))
    files.set('posts/draft.mdx', original('Draft'))
    files.set('fr/posts/paired.mdx', translation)
    files.set('fr/posts/draft.mdx', translation)
    files.set('fr/posts/orphan.mdx', translation)
  })

  it('uses translated copy and preserves published identity and assets', async () => {
    const posts = await getPublishedPosts('fr')
    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({
      slug: 'paired',
      title: 'Article traduit',
      date: '2026-10-11',
      category: 'Craft',
      cover: '/images/source.jpg',
    })
    expect(posts[0].body).toContain('Texte traduit.')
    expect(await getPublishedPosts()).toHaveLength(2)
  })

  it.each(['draft', 'orphan', 'english-only'])('returns no public French article for %s', async (slug) => {
    expect(await getPublishedPost(slug, 'fr')).toBeNull()
  })
})

it('keeps translated project anchors, links and covers tied to the English record', async () => {
  files.clear()
  const source = '---\ntitle: Original project\nyear: 2026\ndescription: Source summary\ncategory: Platforms\ncover: /images/project.jpg\nlinks: { live: "https://example.com" }\n---\nSource project.'
  const translated = '---\ntitle: Projet traduit\ndescription: Résumé français\n---\nDescription complète.'
  files.set('projects/paired.mdx', source)
  files.set('projects/english-only.mdx', source)
  files.set('fr/projects/paired.mdx', translated)
  files.set('fr/projects/orphan.mdx', translated)

  expect(await getProjects('fr')).toEqual([
    expect.objectContaining({
      slug: 'paired',
      title: 'Projet traduit',
      description: 'Résumé français',
      category: 'Platforms',
      year: '2026',
      cover: '/images/project.jpg',
      links: { live: 'https://example.com' },
    }),
  ])
})
