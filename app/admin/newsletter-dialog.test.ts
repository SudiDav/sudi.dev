import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { NewsletterList } from '@/components/admin/newsletter-list'
import type { NewsletterBroadcastSummary } from '@/lib/newsletter'

vi.mock('@/app/admin/actions', () => ({ sendNewsletter: vi.fn() }))

const draft: NewsletterBroadcastSummary = {
  id: 'draft-fixture',
  name: 'Outbox and Inbox',
  status: 'draft',
  createdAt: '2026-11-19T00:00:00.000Z',
}

describe('newsletter send confirmation', () => {
  it('offers a labelled modal from the draft row with explicit confirmation and cancellation', () => {
    const html = renderToStaticMarkup(React.createElement(NewsletterList, { broadcasts: [draft] }))

    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toMatch(/<dialog\b[^>]*aria-labelledby="[^"]+"[^>]*aria-describedby="[^"]+"/)
    expect(html).not.toMatch(/<dialog\b[^>]*\sopen[\s=>]/)
    expect(html).toContain('>Send newsletter?</h2>')
    expect(html).toContain('all subscribed contacts')
    expect(html).toContain('>Cancel</button>')
    expect(html).toContain('Send newsletter</button>')
  })

  it('offers no send action for a sent broadcast', () => {
    const html = renderToStaticMarkup(
      React.createElement(NewsletterList, { broadcasts: [{ ...draft, status: 'sent' }] }),
    )

    expect(html).not.toContain('aria-haspopup="dialog"')
  })
})
