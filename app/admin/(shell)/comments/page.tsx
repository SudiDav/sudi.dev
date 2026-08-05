import { Check, X, MessageSquare } from 'lucide-react'
import { AdminTopBar } from '@/components/admin/admin-ui'
import { adminComments, adminCommentCounts } from '@/lib/admin-fixtures'

/**
 * Design: "Admin — Comments" — a tab row of counts, then a list of cards of
 * padding 20 / gap 14 / radius 12. Each carries the author, the article it is
 * on in $accent, a timestamp, the body, and Approve / Reject / Reply actions.
 *
 * The actions are presentational: moderation needs persistence, which is out
 * of scope for this phase.
 */
export default function AdminCommentsPage() {
  return (
    <>
      <AdminTopBar title="Comments" />

      <div className="flex flex-wrap border-b border-admin-border">
        {adminCommentCounts.map((tab, index) => {
          const active = index === 0
          return (
            <button
              key={tab.label}
              type="button"
              className={`-mb-px flex items-center gap-1.5 px-4 py-2.5 text-[13px] ${
                active
                  ? 'border-b-2 border-accent font-semibold text-accent'
                  : 'text-admin-text-secondary'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-[10px] px-2 py-0.5 text-[11px] ${
                  active ? 'bg-accent-dim text-accent' : 'bg-admin-border text-admin-text-secondary'
                }`}
              >
                {tab.value}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3">
        {adminComments.map((comment) => (
          <article
            key={comment.author}
            className="flex flex-col gap-3.5 rounded-xl border border-admin-border bg-admin-card p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[13px] font-semibold text-admin-text">{comment.author}</span>
                <span className="text-[13px] text-admin-text-tertiary">on</span>
                <span className="text-[13px] text-accent">{comment.post}</span>
              </div>
              <span className="text-xs text-admin-text-tertiary">{comment.time}</span>
            </div>

            <p className="text-sm leading-[1.5] text-admin-text-secondary">{comment.body}</p>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#10B98115] px-3.5 py-1.5 text-xs font-medium text-admin-success"
              >
                <Check size={14} />
                Approve
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#EF444415] px-3.5 py-1.5 text-xs font-medium text-admin-danger"
              >
                <X size={14} />
                Reject
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-admin-border px-3.5 py-1.5 text-xs font-medium text-admin-text-secondary"
              >
                <MessageSquare size={14} />
                Reply
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
