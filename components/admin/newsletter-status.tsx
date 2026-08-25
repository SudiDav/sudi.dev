'use client'

import { CheckCircle2, ExternalLink, TriangleAlert } from 'lucide-react'
import type { NewsletterOutcome } from '@/lib/newsletter'

export function NewsletterStatus({ newsletter }: { newsletter?: NewsletterOutcome | null }) {
  if (!newsletter) return null

  if (!newsletter.ok) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-admin-warning">
        <TriangleAlert size={15} />
        <span>Newsletter draft was not created: {newsletter.error}</span>
        <a href="/admin/newsletters" className="text-accent hover:underline">
          Review newsletters
        </a>
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-admin-text-secondary">
      <CheckCircle2 size={15} className="text-admin-success" />
      <span>Newsletter draft created.</span>
      <a href="/admin/newsletters" className="text-accent hover:underline">
        Review and send
      </a>
      <a
        href={`https://resend.com/broadcasts/${encodeURIComponent(newsletter.id)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-accent hover:underline"
      >
        Open in Resend <ExternalLink size={12} />
      </a>
    </div>
  )
}
