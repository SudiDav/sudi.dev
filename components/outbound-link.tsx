import Link from 'next/link'
import type { ComponentProps } from 'react'

/**
 * A link that leaves the site, and therefore opens in a new tab.
 *
 * `rel="noopener"` is the part that matters beyond tidiness: without it the
 * opened page gets a handle on `window.opener` and can navigate this tab
 * somewhere else. `noreferrer` is carried along so the destination does not
 * receive the referring URL.
 *
 * Centralised rather than repeated so that adding an outbound link cannot
 * quietly omit either — internal navigation should keep using `Link` directly.
 */
export function OutboundLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </Link>
  )
}

/** Links to a path on this site stay in-tab; anything else leaves. */
export function isExternal(href: string) {
  return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:')
}
