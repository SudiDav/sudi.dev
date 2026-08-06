'use client'

import { useState, useTransition } from 'react'
import { Check, X, Ban, Trash2, RotateCcw } from 'lucide-react'
import { moderate, removeComment } from '@/app/admin/actions'
import type { CommentStatus } from '@/lib/comments'

/**
 * Design: the comment card's "Approve / Reject / Reply" row.
 *
 * Reject is modelled as marking spam — the design's label, but "reject" with no
 * destination would just hide a comment with no way back. Spam is reversible
 * and Delete is offered separately for the genuinely unwanted.
 */
export function CommentActions({ id, status }: { id: string; status: CommentStatus }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const run = (work: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null)
    startTransition(async () => {
      const result = await work()
      if (!result.ok) setError(result.error ?? 'Something went wrong')
    })
  }

  const button =
    'inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2.5">
        {status !== 'approved' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => moderate(id, 'approved'))}
            className={`${button} bg-[#10B98115] text-admin-success`}
          >
            <Check size={14} />
            Approve
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => moderate(id, 'pending'))}
            className={`${button} border border-admin-border text-admin-text-secondary`}
          >
            <RotateCcw size={14} />
            Unapprove
          </button>
        )}

        {status !== 'spam' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => moderate(id, 'spam'))}
            className={`${button} bg-[#EF444415] text-admin-danger`}
          >
            <X size={14} />
            Reject
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => moderate(id, 'pending'))}
            className={`${button} border border-admin-border text-admin-text-secondary`}
          >
            <Ban size={14} />
            Not spam
          </button>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm('Delete this comment permanently?')) run(() => removeComment(id))
          }}
          className={`${button} border border-admin-border text-admin-text-secondary`}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>

      {error ? <p className="text-xs text-admin-danger">{error}</p> : null}
    </div>
  )
}
