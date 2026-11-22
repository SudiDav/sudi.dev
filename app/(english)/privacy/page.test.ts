import { Writable } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/privacy' }))

function renderPage(locale: 'en' | 'fr' = 'en'): Promise<string> {
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

    const page = await PrivacyPage({ locale })
    const { pipe } = renderToPipeableStream(page, {
      onAllReady() { pipe(destination) },
      onError: reject,
    })
  })
}
import PrivacyPage from './page'

describe('Privacy room', () => {
  it('keeps the privacy copy, configured contact, and shared footer in its reading surface', async () => {
    const html = await renderPage()

    expect(html).toContain('privacy-reading-room__paper')
    expect(html).toContain('What I collect')
    expect(html).toContain('mailto:hello@sudi.dev')
    expect(html).toContain('href="/privacy"')
  })

  it('renders translated privacy copy in French', async () => {
    const html = await renderPage('fr')

    expect(html).toContain('Confidentialité')
    expect(html).toContain('Ce que je collecte')
    expect(html).toContain('Qui d’autre intervient')
    expect(html).toContain('30 octobre 2026')
    expect(html).not.toContain('What I collect')
    expect(html).not.toContain('Having it removed')
  })
})
