import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    const imageProps = { ...props }
    delete imageProps.fill
    return createElement('img', imageProps)
  },
}))

import { ProjectFolio } from '@/components/project-folio'
import { WorkProjectCard } from '@/components/work-project-card'

describe('ProjectFolio', () => {
  it('frames a new ordinary uploaded cover with a dimensional folio and company logo', () => {
    const html = renderToStaticMarkup(
      createElement(ProjectFolio, { src: '/images/new-cover.webp', alt: '', title: 'New project', logo: '/images/company.svg' }),
    )

    expect(html).toContain('project-folio project-folio--cover')
    expect(html).toContain('project-folio-pages')
    expect(html).toContain('project-folio-face')
    expect(html).toContain('src="/images/new-cover.webp"')
    expect(html).toContain('src="/images/company.svg"')
  })

  it('renders a title-led folio when no cover image is uploaded', () => {
    const html = renderToStaticMarkup(createElement(ProjectFolio, { alt: '', title: 'New project' }))

    expect(html).toContain('project-folio-fallback')
    expect(html).toContain('New project')
  })

  it('leaves prebaked transparent artwork unframed', () => {
    const html = renderToStaticMarkup(
      createElement(ProjectFolio, { src: '/images/work/almafrica.webp', alt: '', title: 'Almafrica', presentation: 'rendered-folio' }),
    )

    expect(html).not.toContain('project-folio-pages')
    expect(html).toContain('project-folio-rendered-artwork')
    expect(html).toContain('src="/images/work/almafrica.webp"')
  })

  it('gives a new unseen project with an ordinary cover the generic folio automatically', () => {
    const html = renderToStaticMarkup(createElement(WorkProjectCard, {
      project: {
        slug: 'brand-new-project',
        title: 'Brand new project',
        year: '2026',
        description: 'A project added after launch.',
        category: 'Platforms',
        cover: '/images/projects/new-cover.webp',
        tech: [],
        links: {},
        body: '',
      },
    }))

    expect(html).toContain('id="brand-new-project"')
    expect(html).toContain('project-folio project-folio--cover')
    expect(html).toContain('src="/images/projects/new-cover.webp"')
  })
})
