'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Mail, Send, TriangleAlert } from 'lucide-react'
import { sendNewsletter } from '@/app/admin/actions'
import type { NewsletterBroadcastSummary } from '@/lib/newsletter'

const STATUS_STYLES = {
  draft: 'bg-[#F59E0B15] text-admin-warning',
  queued: 'bg-[#607EBC20] text-accent',
  sent: 'bg-[#10B98115] text-admin-success',
} as const

export function NewsletterList({ broadcasts }: { broadcasts: NewsletterBroadcastSummary[] }) {
  const [items, setItems] = useState(broadcasts)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const send = (id: string) => {
    if (!window.confirm('Send this newsletter to all subscribed contacts?')) return
    setError(null)
    setPendingId(id)
    startTransition(async () => {
      const result = await sendNewsletter(id)
      if (result.ok) {
        setItems((current) =>
          current.map((item) => (item.id === id ? { ...item, status: 'queued' } : item)),
        )
      } else {
        setError(result.error)
      }
      setPendingId(null)
    })
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-admin-border bg-admin-card p-10 text-center">
        <Mail size={22} className="mx-auto text-admin-text-tertiary" />
        <p className="mt-3 text-sm text-admin-text-secondary">No newsletter drafts yet.</p>
        <p className="mt-1 text-xs text-admin-text-tertiary">
          Publish a post to prepare a branded draft here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <div className="flex items-center gap-2 rounded-lg bg-[#EF444415] px-4 py-3 text-[13px] text-admin-danger">
          <TriangleAlert size={15} />
          {error}
        </div>
      ) : null}
      {items.map((broadcast) => (
        <article
          key={broadcast.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-admin-border bg-admin-card p-5"
        >
          <div className="flex min-w-0 items-start gap-3">
            <Mail size={18} className="mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0">
              <h2 className="truncate text-[14px] font-medium text-admin-text">{broadcast.name}</h2>
              <p className="mt-1 text-xs text-admin-text-tertiary">
                Created {broadcast.createdAt.slice(0, 10)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-xl px-2.5 py-1 text-[11px] font-medium uppercase ${STATUS_STYLES[broadcast.status]}`}
            >
              {broadcast.status}
            </span>
            <a
              href={`https://resend.com/broadcasts/${encodeURIComponent(broadcast.id)}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${broadcast.name} in Resend`}
              className="text-admin-text-tertiary hover:text-admin-text"
            >
              <ExternalLink size={15} />
            </a>
            {broadcast.status === 'draft' ? (
              <button
                type="button"
                onClick={() => send(broadcast.id)}
                disabled={pendingId === broadcast.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <Send size={13} />
                {pendingId === broadcast.id ? 'Sending…' : 'Send'}
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}
