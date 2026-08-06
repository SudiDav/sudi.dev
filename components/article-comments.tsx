import { MessageSquarePlus } from 'lucide-react'
import { getApprovedComments, relativeTime } from '@/lib/comments'
import { CommentForm } from './comment-form'

/**
 * Design: Article Page → "Comment Section" — COLUMN, padding [48,0], gap 32,
 * with a 720px inner column.
 *
 * The thread is real: only approved comments render, and the form below stores
 * new ones as pending for moderation in the admin.
 */
export async function ArticleComments({ postSlug }: { postSlug: string }) {
  const comments = await getApprovedComments(postSlug)

  return (
    <section className="flex flex-col items-center px-4 py-12 md:px-8">
      <div className="flex w-full max-w-[720px] flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-[22px] font-semibold text-text-primary">
            Comments ({comments.length})
          </h2>
          <a
            href="#comment-form"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <MessageSquarePlus size={16} />
            Write a comment
          </a>
        </div>

        <div id="comment-form">
          <CommentForm postSlug={postSlug} />
        </div>

        {comments.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            No comments yet — be the first to say something.
          </p>
        ) : (
          <div className="flex flex-col">
            {comments.map((comment, index) => (
              <article
                key={comment.id}
                className={`flex gap-4 py-6 ${
                  index < comments.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {comment.author}
                    </span>
                    <span className="text-sm text-text-tertiary">·</span>
                    <span className="text-[13px] text-text-tertiary">
                      {relativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-[1.6] text-text-secondary">{comment.body}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
