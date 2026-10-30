import { describe, expect, it, vi } from 'vitest'
import { runWeeklyDraft } from '../sites/weekly-article/worker'

describe('weekly scheduled invocation', () => {
  it('fails closed without a secret, without calling the site', async () => {
    const fetch = vi.fn()
    await expect(runWeeklyDraft({ SITE: { fetch } })).rejects.toThrow('CRON_SECRET')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('calls only the protected weekly endpoint and propagates failures', async () => {
    let request: Request | undefined
    const SITE = { fetch: async (input: Request) => {
      request = input
      return new Response('unauthorized', { status: 401 })
    } }
    await expect(runWeeklyDraft({ SITE, CRON_SECRET: 'test-cron-secret' })).rejects.toThrow('401')
    expect(request?.url).toBe('https://sudi.dev/api/cron/weekly-article')
    expect(request?.headers.get('authorization')).toBe('Bearer test-cron-secret')
  })

  it('accepts a successful site response without a subscriber broadcast', async () => {
    const SITE = { fetch: async () => new Response('{"ok":true,"created":false}', { status: 200 }) }
    await expect(runWeeklyDraft({ SITE, CRON_SECRET: 'test-cron-secret' })).resolves.toBeUndefined()
  })
})
