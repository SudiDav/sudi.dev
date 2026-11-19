import { Writable } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getProjects: vi.fn(),
  cardProjectSlugs: [] as string[],
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/content', () => ({ getProjects: mocks.getProjects }))
vi.mock('@/components/site-header', () => ({ SiteHeader: () => null }))
vi.mock('@/components/site-footer', () => ({ SiteFooter: () => null }))
vi.mock('@/components/page-intro', () => ({ PageIntro: () => null }))
vi.mock('@/components/filter-bar', () => ({ FilterBar: () => null }))
vi.mock('@/components/work-project-card', () => ({
  WorkProjectCard: ({ project }: { project: { slug: string } }) => {
    mocks.cardProjectSlugs.push(project.slug)
    return createElement('article', { id: project.slug, className: 'work-project-card' })
  },
}))
vi.mock('@/components/company-showcase', () => ({ CompanyShowcase: () => null }))
vi.mock('@/components/layout', () => ({ WORK_GUTTER: '' }))

import WorkPage from './page'

const projects = [
  { slug: 'first', title: 'First folio', year: '2026', category: 'Platforms', cover: '/first.webp', description: 'First', shortDescription: 'First summary', tech: [], links: {} },
  { slug: 'second', title: 'Second folio', year: '2025', category: 'Platforms', cover: '/second.webp', description: 'Second', shortDescription: 'Second summary', tech: [], links: {} },
  { slug: 'third', title: 'Third folio', year: '2024', category: 'Fintech', cover: '/third.webp', description: 'Third', shortDescription: 'Third summary', tech: [], links: {} },
]

function renderPage(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let html = ''
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        html += chunk.toString()
        callback()
      },
    })
    destination.on('finish', () => resolve(html))
    destination.on('error', reject)

    const page = await WorkPage({ searchParams: Promise.resolve({}) })
    const { pipe } = renderToPipeableStream(page, {
      onAllReady() { pipe(destination) },
      onError: reject,
    })
  })
}

describe('Work project gallery', () => {
  beforeEach(() => {
    mocks.getProjects.mockReset().mockResolvedValue(projects)
    mocks.cardProjectSlugs.length = 0
  })

  it('renders each filtered project as an individual card in a responsive gallery without rails', async () => {
    const html = await renderPage()

    expect(html).toContain('work-project-grid')
    expect([...html.matchAll(/class="work-project-card"/g)]).toHaveLength(projects.length)
    expect(html.indexOf('id="first"')).toBeLessThan(html.indexOf('id="second"'))
    expect(html.indexOf('id="second"')).toBeLessThan(html.indexOf('id="third"'))
    expect(html).not.toContain('work-shelf')
    expect(html).not.toContain('work-rail')
    expect(html).toContain('grid-cols-1')
    expect(html).toContain('sm:grid-cols-2')
    expect(html).toContain('lg:grid-cols-3')
    expect(mocks.cardProjectSlugs).toEqual(['first', 'second', 'third'])
  })
})
