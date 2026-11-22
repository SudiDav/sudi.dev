import { renderToReadableStream } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import HomePage from './page'
import { getSettings } from '@/lib/site'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('homepage project invitations', () => {
  let markup: string
  let intro: string

  beforeAll(async () => {
    const stream = await renderToReadableStream(await HomePage())
    await stream.allReady
    markup = await new Response(stream).text()
    const sceneStart = markup.indexOf('class="portfolio-world"')
    expect(sceneStart).toBeGreaterThan(0)
    intro = markup.slice(0, sceneStart)
  })

  it('invites software projects across industries', () => {
    expect(intro).toContain('I help teams build new software and improve the systems they already use.')
  })

  it('links to a free 30-minute project call request at the configured email address', async () => {
    const { email } = await getSettings()

    expect(email).toBe('hello@sudi.dev')
    expect(intro).toContain('href="#contact"')
    expect(intro).toContain('Discuss a project')
    expect(markup).toContain('id="contact"')
    expect(markup).toContain('Have a project in mind?')
    expect(markup).toContain('Request a free 30-minute call')
    expect(markup).toContain(`href="mailto:${email}?subject=Free%2030-minute%20project%20call"`)
  })

  it('links to relevant project evidence before the 3D scene', () => {
    expect(intro).toContain('href="/work#altech-paygo"')
    expect(intro).toContain('Connected field sales to accounting.')
    expect(intro).toContain('href="/work#chequepoint"')
    expect(intro).toContain('Cut paperwork by 70% for AB Bank.')
  })
})
