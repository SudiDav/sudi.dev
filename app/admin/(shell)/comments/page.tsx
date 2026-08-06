import Link from 'next/link'
import { AdminTopBar } from '@/components/admin/admin-ui'
import { getCommentsByStatus, getCommentCounts, relativeTime } from '@/lib/comments'
import type { CommentStatus } from '@/lib/comments'
import { getPosts } from '@/lib/content'
import { CommentActions } from './comment-actions'

export const metadata = { robots: { index: false, follow: false } }

const STATUSES = ['all', 'pending', 'approved', 'spam'] as const

/**
 * Design: "Admin — Comments" — a tab row of counts, then a list of cards of
 * padding 20 / gap 14 / radius 12.
 *
 * The design highlights "Pending", so that is the default view: the queue
 * opens on what actually needs attention.
 */
export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const active = (STATUSES as readonly string[]).includes(status ?? '')
    ? (status as (typeof STATUSES)[number])
    : 'pending'

  const [comments, counts, posts] = await Promise.all([
    getCommentsByStatus(active),
    getCommentCounts(),
    getPosts(),
  ])
  const titleFor = (slug: string) => posts.find((post) => post.slug === slug)?.title ?? slug

  return (
    <>
      <AdminTopBar title="Comments" />

      <div className="flex flex-wrap border-b border-admin-border">
        {counts.map((tab) => {
          const selected = tab.status === active
          return (
            <Link
              key={tab.label}
              href={tab.status === 'pending' ? '/admin/comments' : `/admin/comments?status=${tab.status}`}
              aria-current={selected ? 'page' : undefined}
              className={`-mb-px flex items-center gap-1.5 px-4 py-2.5 text-[13px] ${
                selected
                  ? 'border-b-2 border-accent font-semibold text-accent'
                  : 'text-admin-text-secondary hover:text-admin-text'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-[10px] px-2 py-0.5 text-[11px] font-normal ${
                  selected
                    ? 'bg-accent-dim text-accent'
                    : 'bg-admin-border text-admin-text-secondary'
                }`}
              >
                {tab.value}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="flex flex-col gap-3">
        {comments.length === 0 ? (
          <p className="rounded-xl border border-admin-border bg-admin-card p-6 text-[13px] text-admin-text-secondary">
            Nothing here.
          </p>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="flex flex-col gap-3.5 rounded-xl border border-admin-border bg-admin-card p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[13px] font-semibold text-admin-text">
                    {comment.author}
                  </span>
                  <span className="text-[13px] text-admin-text-tertiary">on</span>
                  <Link
                    href={`/blog/${comment.postSlug}`}
                    className="text-[13px] text-accent hover:underline"
                  >
                    {titleFor(comment.postSlug)}
                  </Link>
                </div>
                <span className="text-xs text-admin-text-tertiary">
                  {relativeTime(comment.createdAt)}
                </span>
              </div>

              <p className="text-sm leading-[1.5] text-admin-text-secondary">{comment.body}</p>

              <CommentActions id={comment.id} status={comment.status as CommentStatus} />
            </article>
          ))
        )}
      </div>
    </>
  )
}
