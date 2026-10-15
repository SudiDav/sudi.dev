import { Writable } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import AboutPage from '@/app/about/page'

vi.mock('next/navigation', () => ({
  usePathname: () => '/about',
}))

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

    const page = await AboutPage()
    const { pipe } = renderToPipeableStream(page, {
      onAllReady() {
        pipe(destination)
      },
      onError: reject,
    })
  })
}

describe('about page professional profile', () => {
  it('renders the current Almafrica consultancy and corrected employment locations', async () => {
    const html = await renderPage()

    expect(html).toContain('Software Engineering Consultant &amp; Entrepreneur')
    expect(html).toContain('Almafrica · Lubumbashi, DR Congo')
    expect(html).toContain('IST Africa · Remote, Denmark')
    expect(html).toContain('Cloud, DevOps &amp; Software Engineer')
    expect(html).toContain('Altech Group · Goma, DR Congo (Hybrid)')
    expect(html).not.toContain('Altech Group · Kigali (Hybrid)')
  })

  it('includes Coolify and DigitalOcean in the infrastructure skills', async () => {
    const html = await renderPage()

    expect(html).toContain('AWS · DigitalOcean')
    expect(html).toContain('Cloudflare · Coolify')
  })

  it('offers the Congolese phone number as a callable contact link', async () => {
    const html = await renderPage()

    expect(html).toContain('href="tel:+243817334881"')
    expect(html).toContain('+243 817 334 881')
  })
})
