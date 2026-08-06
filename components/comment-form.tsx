'use client'

import { useState, useTransition } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import { submitComment } from '@/app/admin/actions'

/**
 * Design: Article Page → "Comment Input" — padding 20, gap 16, radius 12, with
 * a formatting row and a Post button at 50% opacity until there is something to
 * post.
 *
 * The design shows a signed-in author, but a public blog's commenters are not
 * signed in — so name and email fields replace the static "Sudi David" label.
 * Submissions are held for moderation and never appear until approved.
 */
export function CommentForm({ postSlug }: { postSlug: string }) {
  const [author, setAuthor] = useState('')
  const [email, setEmail] = useState('')
  const [body, setBody] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await submitComment({ postSlug, author, email, body })
      if (result.ok) {
        setDone(true)
        setAuthor('')
        setEmail('')
        setBody('')
      } else {
        setError(result.error)
      }
    })
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-card p-5 text-sm text-text-secondary">
        <Check size={16} className="text-accent" />
        Thanks — your comment is awaiting moderation.
      </div>
    )
  }

  const field =
    'rounded-lg border border-border bg-bg-secondary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-hover focus:outline-none'

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Your name"
          placeholder="Your name"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          className={`flex-1 ${field}`}
        />
        <input
          aria-label="Your email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`flex-1 ${field}`}
        />
      </div>

      <textarea
        aria-label="Your comment"
        rows={3}
        placeholder="Share your thoughts on this article..."
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className={field}
      />

      {error ? (
        <p className="flex items-center gap-2 text-sm text-[#EF4444]">
          <TriangleAlert size={14} />
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-tertiary">Comments are reviewed before appearing.</span>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Posting…' : 'Post comment'}
        </button>
      </div>
    </div>
  )
}
