import { describe, expect, it } from 'vitest'
import { createContentReader } from './bundled-content'

describe('bundled content reads in Workers', () => {
  const reader = createContentReader({
    'posts/hello.mdx': '---\ntitle: Hello\n---\nArticle body',
    'projects/app.mdx': 'Project body',
    'site.json': '{"displayName":"Sudi"}',
  })

  it('reads the content snapshot without depending on a local content directory', async () => {
    expect(await reader.readdir('/bundle/content/posts')).toEqual(['hello.mdx'])
    expect(await reader.readFile('/bundle/content/posts/hello.mdx', 'utf8')).toContain('Article body')
    expect(await reader.readFile('/bundle/content/site.json', 'utf8')).toBe('{"displayName":"Sudi"}')
  })

  it('rejects unknown files and traversal instead of leaking other bundled files', async () => {
    await expect(reader.readFile('/bundle/content/../secret', 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(reader.readFile('/bundle/content/posts/missing.mdx', 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(reader.readdir('/bundle/private')).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
