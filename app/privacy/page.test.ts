import { Writable } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/privacy' }))

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

    const page = await PrivacyPage()
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
    expect(html).toContain('mailto:contact@sudi.dev')
    expect(html).toContain('href="/privacy"')
  })
})
