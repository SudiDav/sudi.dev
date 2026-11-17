import { describe, expect, it } from 'vitest'
import { publicAnalyticsConfig } from './site-analytics'

describe('public site analytics', () => {
  it('measures production page loads without observing SPA transitions into admin', () => {
    expect(publicAnalyticsConfig('sudi.dev', '/blog/article')).toMatchObject({ spa: false })
  })

  it.each([
    ['sudi.dev', '/admin'], ['sudi.dev', '/admin/posts'],
    ['localhost', '/'], ['127.0.0.1', '/'], ['preview.sudi.dev', '/'],
    ['sudi-dev-preview.sudidav.workers.dev', '/'], ['sudi-dev.vercel.app', '/'],
  ])('does not install analytics on %s%s', (hostname, path) => {
    expect(publicAnalyticsConfig(hostname, path)).toBeNull()
  })
})
