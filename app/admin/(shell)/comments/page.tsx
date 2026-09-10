import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { AdminCard, AdminTopBar } from '@/components/admin/admin-ui'
import { getAdminComments } from '@/lib/admin-comments'
import type { CommentStatus, ModerationStatus } from '@/lib/comments/types'
import { deleteCommentAction, moderateCommentAction } from './actions'

export const dynamic = 'force-dynamic'

const FILTERS: Array<{ label: string; value?: CommentStatus }> = [
  { label: 'All' },
  { label: 'Pending', value: 'pending' },
  { label: 'Published', value: 'published' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Spam', value: 'spam' },
]

const STATUS_STYLES: Record<CommentStatus, string> = {
  pending: 'bg-[#F59E0B15] text-admin-warning',
  published: 'bg-[#10B98115] text-admin-success',
  rejected: 'bg-[#9CA3AF15] text-admin-text-tertiary',
  spam: 'bg-[#EF444415] text-admin-danger',
}

function formatCommentDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function initials(name: string) {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function selectedStatus(value: string | string[] | undefined): CommentStatus | undefined {
  const status = Array.isArray(value) ? value[0] : value
  return FILTERS.some((filter) => filter.value === status) ? (status as CommentStatus) : undefined
}

function ModerationButton({
  id,
  status,
  children,
}: {
  id: string
  status: ModerationStatus
  children: React.ReactNode
}) {
  return (
    <form
      action={async () => {
        'use server'
        await moderateCommentAction(id, status)
      }}
    >
      <button
        type="submit"
        className="min-h-10 rounded-lg border border-admin-border px-3 text-[12px] font-medium text-admin-text-secondary transition-colors hover:bg-admin-bg hover:text-admin-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {children}
      </button>
    </form>
  )
}

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>
}) {
  const { status: queryStatus } = await searchParams
  const status = selectedStatus(queryStatus)
  const result = await getAdminComments(status)

  return (
    <>
      <AdminTopBar
        title="Comments"
        subtitle={
          result.error
            ? 'Comment storage could not be loaded.'
            : `${result.comments.length} ${status ?? 'stored'} comment${result.comments.length === 1 ? '' : 's'}.`
        }
      />

      <nav aria-label="Comment status" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = filter.value === status
          return (
            <Link
              key={filter.label}
              href={filter.value ? `/admin/comments?status=${filter.value}` : '/admin/comments'}
              aria-current={active ? 'page' : undefined}
              className={`rounded-full px-3 py-2 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active
                  ? 'bg-accent-dim text-accent'
                  : 'bg-admin-card text-admin-text-secondary hover:text-admin-text'
              }`}
            >
              {filter.label}
            </Link>
          )
        })}
      </nav>

      {result.error ? (
        <div className="rounded-xl border border-admin-border bg-admin-card p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-accent-dim p-2 text-accent">
              <MessageCircle size={18} />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-admin-text">Comments are unavailable</h2>
              <p className="text-[13px] leading-5 text-admin-text-secondary">
                Check that the Neon database is connected and the comments migration has been
                applied.
              </p>
            </div>
          </div>
        </div>
      ) : result.comments.length === 0 ? (
        <AdminCard title="Comment queue">
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <MessageCircle size={22} className="text-admin-text-tertiary" />
            <p className="text-sm text-admin-text-secondary">No comments in this view.</p>
            <p className="text-[13px] text-admin-text-tertiary">
              New guest comments will arrive in Pending.
            </p>
          </div>
        </AdminCard>
      ) : (
        <div className="flex flex-col gap-4">
          {result.comments.map((comment) => (
            <AdminCard key={comment.id} className="gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-accent-dim text-xs font-semibold text-accent">
                    {initials(comment.authorName)}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-admin-text">
                      {comment.authorName}
                    </span>
                    <span className="text-[11px] text-admin-text-tertiary">
                      {comment.authorType} · {formatCommentDate(comment.createdAt)}
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${STATUS_STYLES[comment.status]}`}
                >
                  {comment.status}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  href={`/blog/${comment.articleSlug}`}
                  className="text-[13px] font-medium text-accent hover:underline"
                >
                  {comment.articleSlug}
                </Link>
                <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-admin-text-secondary">
                  {comment.body}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-admin-border pt-4">
                {comment.status !== 'published' ? (
                  <ModerationButton id={comment.id} status="published">
                    Publish
                  </ModerationButton>
                ) : null}
                {comment.status !== 'rejected' ? (
                  <ModerationButton id={comment.id} status="rejected">
                    Reject
                  </ModerationButton>
                ) : null}
                {comment.status !== 'spam' ? (
                  <ModerationButton id={comment.id} status="spam">
                    Spam
                  </ModerationButton>
                ) : null}
                <form
                  action={async () => {
                    'use server'
                    await deleteCommentAction(comment.id)
                  }}
                >
                  <button
                    type="submit"
                    className="min-h-10 rounded-lg px-3 text-[12px] font-medium text-admin-danger transition-colors hover:bg-[#EF444415] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-danger"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </>
  )
}
