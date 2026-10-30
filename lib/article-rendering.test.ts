import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { ArticleBody } from '../components/article-body'

vi.mock('server-only', () => ({}))
vi.mock('@/auth', () => ({ isAdmin: vi.fn().mockResolvedValue(false) }))

afterEach(() => vi.unstubAllGlobals())

describe('article rendering in Workers', () => {
  it('renders existing article components without dynamic code generation', async () => {
    vi.stubGlobal('Function', new Proxy(Function, {
      construct() { throw new EvalError('Code generation from strings disallowed') },
    }))
    const view = ArticleBody({ body: '## Heading\n\nA **bold** paragraph with [docs](https://example.com).\n\n```typescript\nconst answer = 42\n```' })
    const render = view.type as (props: typeof view.props) => ReactElement | Promise<ReactElement>
    const html = renderToStaticMarkup(await render(view.props))
    expect(html).toContain('font-display text-[28px]')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('typescript')
    expect(html).toContain('answer')
  })
})
