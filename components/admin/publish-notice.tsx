'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, X } from 'lucide-react'
import { DeploymentStatus } from './deployment-status'
import { NewsletterStatus } from './newsletter-status'
import type { PublishResult } from '@/lib/publish'
import type { NewsletterOutcome } from '@/lib/newsletter'

/**
 * Confirms that a save actually published.
 *
 * Without this the admin redirects silently, the site still shows the old
 * content for a minute or so, and the only reasonable conclusion is that the
 * save failed. It did not — the change is committed, and the site rebuilds
 * from that commit. Saying so is the difference between a slow deploy and an
 * apparently broken one.
 */
export function PublishNotice() {
  const params = useSearchParams()
  const published = params.get('published')
  if (!published) return null
  const sha = params.get('sha')
  const publish: PublishResult | undefined = sha
    ? {
        target: 'github',
        sha,
        branch: params.get('branch') ?? undefined,
        commitUrl: params.get('commitUrl') ?? undefined,
      }
    : undefined
  const newsletter: NewsletterOutcome | undefined = params.get('newsletterId')
    ? {
        ok: true,
        id: params.get('newsletterId')!,
        name: params.get('newsletterName') ?? 'sudi.dev newsletter draft',
        created: true,
      }
    : undefined

  // Keyed on the slug so a later save mounts a fresh notice rather than
  // resetting state from an effect.
  return (
    <Notice
      key={`${published}-${sha ?? ''}`}
      published={published}
      publish={publish}
      newsletter={newsletter}
    />
  )
}

function Notice({
  published,
  publish,
  newsletter,
}: {
  published: string
  publish?: PublishResult
  newsletter?: NewsletterOutcome
}) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-admin-success/30 bg-admin-success/10 px-4 py-3">
      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-admin-success" />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-medium text-admin-text">
          Published “{published}” to the live site
        </span>
        <span className="text-[12px] text-admin-text-secondary">
          Committed to {publish?.branch ?? 'main'}. The site rebuilds from that commit.
        </span>
        <DeploymentStatus publish={publish} />
        <NewsletterStatus newsletter={newsletter} />
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="rounded p-1 text-admin-text-tertiary transition-colors hover:text-admin-text"
      >
        <X size={14} />
      </button>
    </div>
  )
}
