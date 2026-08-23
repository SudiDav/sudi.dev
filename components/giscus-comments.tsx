'use client'

import { useEffect, useRef } from 'react'
import { LIGHT_CLASS } from '@/lib/theme'

const GISCUS_ORIGIN = 'https://giscus.app'

const CONFIG = {
  repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
  repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID,
  category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
  categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
}

/** giscus ships named themes; these are the closest to the site's two. */
const themeFor = (light: boolean) => (light ? 'light' : 'dark_dimmed')

/**
 * Comments, backed by GitHub Discussions.
 *
 * Chosen over a form writing to the repo for two reasons: commenters are real
 * GitHub accounts rather than a name typed into a box, and nothing has to be
 * stored here — a discussion is created on the first comment and lives in the
 * repo's Discussions tab, which is also where moderation happens.
 *
 * The script is injected rather than written as JSX because giscus reads its
 * configuration off the script tag's data attributes at load time.
 */
export function GiscusComments() {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = container.current
    if (!host || !CONFIG.repo || !CONFIG.repoId || !CONFIG.category || !CONFIG.categoryId) return

    const script = document.createElement('script')
    script.src = `${GISCUS_ORIGIN}/client.js`
    script.async = true
    script.crossOrigin = 'anonymous'
    Object.entries({
      repo: CONFIG.repo,
      'repo-id': CONFIG.repoId,
      category: CONFIG.category,
      'category-id': CONFIG.categoryId,
      // One discussion per post, keyed on the URL path.
      mapping: 'pathname',
      strict: '1',
      'reactions-enabled': '1',
      'emit-metadata': '0',
      'input-position': 'top',
      theme: themeFor(document.documentElement.classList.contains(LIGHT_CLASS)),
      lang: 'en',
      loading: 'lazy',
    }).forEach(([key, value]) => script.setAttribute(`data-${key}`, value))

    host.appendChild(script)
    return () => {
      host.innerHTML = ''
    }
  }, [])

  // The embed cannot read the page's theme, so it is pushed in on every change.
  useEffect(() => {
    const send = () => {
      const frame = container.current?.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
      frame?.contentWindow?.postMessage(
        {
          giscus: {
            setConfig: { theme: themeFor(document.documentElement.classList.contains(LIGHT_CLASS)) },
          },
        },
        GISCUS_ORIGIN,
      )
    }

    const observer = new MutationObserver(send)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    // The iframe ignores messages sent before it loads, so re-send once it has.
    window.addEventListener('message', send)
    return () => {
      observer.disconnect()
      window.removeEventListener('message', send)
    }
  }, [])

  return <div ref={container} className="giscus min-h-[200px]" />
}
