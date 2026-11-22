import { renderToReadableStream } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as site from '@/lib/site'
import { HomeView } from './home-view'

vi.mock('next/navigation', () => ({ usePathname: () => '/fr' }))

afterEach(() => vi.restoreAllMocks())

describe('French project inquiry', () => {
  it('uses the configured Cal.com event and still provides direct email', async () => {
    vi.spyOn(site, 'getLocalizedSiteSettings').mockResolvedValue({
      ...site.DEFAULT_SETTINGS,
      bookingUrls: { en: 'https://cal.com/example/project', fr: 'https://cal.com/example/projet' },
    })

    const stream = await renderToReadableStream(await HomeView({ locale: 'fr' }))
    await stream.allReady
    const html = await new Response(stream).text()

    expect(html).toContain('href="https://cal.com/example/projet"')
    expect(html).toContain('Réserver un appel gratuit de 30 minutes')
    expect(html).toContain('href="mailto:hello@sudi.dev?subject=Appel%20de%2030%20minutes%20pour%20mon%20projet"')
    expect(html).not.toContain('href="https://cal.com/example/project"')
  })
})
