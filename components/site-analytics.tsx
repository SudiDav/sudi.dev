'use client'

import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { publicAnalyticsConfig } from '@/lib/site-analytics'

export function SiteAnalytics({ cloudflare }: { cloudflare: boolean }) {
  useEffect(() => {
    if (!cloudflare) return
    const config = publicAnalyticsConfig(window.location.hostname, window.location.pathname)
    if (!config) return
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
    script.dataset.cfBeacon = JSON.stringify(config)
    document.body.append(script)
    return () => script.remove()
  }, [cloudflare])

  return cloudflare ? null : <Analytics />
}
