import Link from 'next/link'
import { ExternalLink, MessageCircle } from 'lucide-react'
import { AdminCard, AdminTopBar } from '@/components/admin/admin-ui'
import { getAdminComments } from '@/lib/admin-comments'

export const dynamic = 'force-dynamic'

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

export default async function AdminCommentsPage() {
  const result = await getAdminComments()

  return (
    <>
      <AdminTopBar
        title="Comments"
        subtitle={
          result.error
            ? 'GitHub Discussions could not be loaded.'
            : `${result.comments.length} comments across ${result.discussions} discussions.`
        }
      />

      {result.error ? (
        <div className="rounded-xl border border-admin-border bg-admin-card p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-accent-dim p-2 text-accent">
              <MessageCircle size={18} />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-admin-text">Comments are unavailable</h2>
              <p className="text-[13px] leading-5 text-admin-text-secondary">
                Check that the GitHub repository is public and that its Discussions feature is
                enabled. The public comments on the site are powered by giscus.
              </p>
            </div>
          </div>
        </div>
      ) : result.comments.length === 0 ? (
        <AdminCard title="Latest comments">
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <MessageCircle size={22} className="text-admin-text-tertiary" />
            <p className="text-sm text-admin-text-secondary">No comments yet.</p>
            <p className="text-[13px] text-admin-text-tertiary">
              Comments left on blog posts will appear here.
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
                    {initials(comment.author)}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <a
                      href={comment.authorUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-semibold text-admin-text hover:text-accent"
                    >
                      {comment.author}
                    </a>
                    <span className="text-[11px] text-admin-text-tertiary">
                      {formatCommentDate(comment.createdAt)}
                    </span>
                  </div>
                </div>

                <a
                  href={comment.discussionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-admin-text-secondary hover:text-accent"
                >
                  Open discussion
                  <ExternalLink size={13} />
                </a>
              </div>

              <div className="flex flex-col gap-2">
                {comment.postSlug ? (
                  <Link
                    href={`/blog/${comment.postSlug}`}
                    className="text-[13px] font-medium text-accent hover:underline"
                  >
                    {comment.postTitle ?? comment.postSlug}
                  </Link>
                ) : (
                  <span className="text-[13px] font-medium text-admin-text-secondary">
                    {comment.discussionTitle}
                  </span>
                )}
                <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-admin-text-secondary">
                  {comment.body}
                </p>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </>
  )
}
