import { renderToReadableStream } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import HomePage from '@/app/page'
import { getSettings } from '@/lib/site'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('homepage consulting introduction', () => {
  let intro: string

  beforeAll(async () => {
    const stream = await renderToReadableStream(await HomePage())
    await stream.allReady
    const markup = await new Response(stream).text()
    const sceneStart = markup.indexOf('class="portfolio-world"')
    expect(sceneStart).toBeGreaterThan(0)
    intro = markup.slice(0, sceneStart)
  })

  it('identifies who the service helps and what they can hire Sudi to do', () => {
    expect(intro).toContain('I help lending and PAYGO teams connect their systems and automate payment reconciliation.')
  })

  it('offers direct contact at the configured email address', async () => {
    const { email } = await getSettings()

    expect(intro).toContain(`href="mailto:${email}"`)
    expect(intro).toContain('Discuss a project')
  })

  it('links to relevant project evidence before the 3D scene', () => {
    expect(intro).toContain('href="/work#altech-paygo"')
    expect(intro).toContain('Connected field sales to accounting.')
    expect(intro).toContain('href="/work#chequepoint"')
    expect(intro).toContain('Cut paperwork by 70% for AB Bank.')
  })
})
