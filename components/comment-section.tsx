'use client'

import { useActionState, useMemo, useRef, useState } from 'react'
import { MessageCircle, Reply } from 'lucide-react'
import { submitArticleComment, type CommentFormState } from '@/app/blog/[slug]/comment-actions'
import type { PublicComment } from '@/lib/comments/types'
import type { CommentViewer } from './comment-auth-buttons'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function commentDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function Avatar({ comment }: { comment: PublicComment }) {
  return comment.authorAvatarUrl ? (
    // OAuth avatars come from provider-specific hosts that are not known at build time.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={comment.authorAvatarUrl} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full object-cover" />
  ) : (
    <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-accent-dim text-[11px] font-semibold text-accent">
      {initials(comment.authorName)}
    </span>
  )
}

function CommentItem({
  comment,
  canReply,
  onReply,
}: {
  comment: PublicComment
  canReply: boolean
  onReply: (comment: PublicComment) => void
}) {
  return (
    <article className="flex gap-3">
      <Avatar comment={comment} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className="text-[13px] font-semibold text-text-primary">{comment.authorName}</h3>
          <span className="sr-only">Signed in with {comment.authorType}</span>
          <time dateTime={comment.createdAt} className="text-[11px] text-text-tertiary">
            {commentDate(comment.createdAt)}
          </time>
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-6 text-text-secondary">
          {comment.body}
        </p>
        {canReply ? (
          <button type="button" onClick={() => onReply(comment)} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-text-tertiary hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <Reply size={13} />
            Reply
          </button>
        ) : null}
      </div>
    </article>
  )
}

export function CommentSection({
  articleSlug,
  initialComments,
  viewer,
  unavailable,
  auth,
}: {
  articleSlug: string
  initialComments: PublicComment[]
  viewer: CommentViewer | null
  unavailable: boolean
  auth: React.ReactNode
}) {
  const [replyTo, setReplyTo] = useState<PublicComment | null>(null)
  const [state, action, pending] = useActionState<CommentFormState, FormData>(
    submitArticleComment,
    null,
  )
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const comments = useMemo(() => {
    if (
      !state?.ok ||
      state.status !== 'published' ||
      initialComments.some((comment) => comment.id === state.comment.id)
    ) {
      return initialComments
    }
    return [...initialComments, state.comment]
  }, [initialComments, state])

  const threads = useMemo(
    () =>
      comments
        .filter((comment) => !comment.parentId)
        .map((comment) => ({
          comment,
          replies: comments.filter((reply) => reply.parentId === comment.id),
        })),
    [comments],
  )

  const chooseReply = (comment: PublicComment) => {
    setReplyTo(comment)
    requestAnimationFrame(() => bodyRef.current?.focus())
  }

  const handleSubmit = (formData: FormData) => {
    setReplyTo(null)
    action(formData)
  }

  return (
    <div className="flex flex-col gap-8">
      {threads.length ? (
        <div className="flex flex-col gap-7">
          {threads.map(({ comment, replies }) => (
            <div key={comment.id} className="flex flex-col gap-5">
              <CommentItem comment={comment} canReply={!unavailable} onReply={chooseReply} />
              {replies.length ? (
                <div className="ml-4 flex flex-col gap-5 border-l border-accent/40 pl-5 sm:ml-6 sm:pl-6">
                  {replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} canReply={false} onReply={chooseReply} />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 border-y border-border py-5 text-text-secondary">
          <MessageCircle size={18} className="text-text-tertiary" />
          <p className="text-[13px]">No comments yet. Start the conversation.</p>
        </div>
      )}

      <div className="flex flex-col gap-5 rounded-xl border border-border bg-bg-card p-5 sm:p-6">
        {auth}
        {unavailable ? (
          <p className="text-[13px] leading-5 text-text-secondary">
            Comments are temporarily unavailable. Please check back soon.
          </p>
        ) : (
          <form action={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="articleSlug" value={articleSlug} />
            <input type="hidden" name="parentId" value={replyTo?.id ?? ''} />

            {replyTo ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-bg-elevated px-3 py-2 text-[12px] text-text-secondary">
                <span>Replying to {replyTo.authorName}</span>
                <button type="button" onClick={() => setReplyTo(null)} className="font-medium text-text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                  Cancel
                </button>
              </div>
            ) : null}

            {!viewer ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="comment-name" className="text-[12px] font-medium text-text-primary">Name</label>
                <input id="comment-name" name="guestName" maxLength={80} autoComplete="name" className="min-h-10 rounded-lg border border-border bg-bg-primary px-3 text-[13px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent" placeholder="Your name" />
              </div>
            ) : (
              <input type="hidden" name="guestName" value="" />
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="comment-body" className="text-[12px] font-medium text-text-primary">Your comment</label>
              <textarea ref={bodyRef} id="comment-body" name="body" required maxLength={4000} rows={5} className="resize-y rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-[14px] leading-6 text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent" placeholder="Add to the conversation…" />
            </div>

            <div className="flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p aria-live="polite" className={`text-[12px] leading-5 ${state && !state.ok ? 'text-red-400' : 'text-text-secondary'}`}>
                {state?.ok && state.status === 'pending'
                  ? 'Your comment is waiting for review.'
                  : state?.ok && state.status === 'published'
                    ? 'Your comment is published.'
                    : state && !state.ok
                      ? state.message
                      : !viewer
                        ? 'Guest comments appear after review.'
                        : 'Your comment will appear immediately.'}
              </p>
              <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-accent px-4 text-[13px] font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60">
                {pending ? 'Posting…' : replyTo ? 'Post reply' : 'Post comment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
