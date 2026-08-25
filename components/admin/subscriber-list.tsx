import { Mail, Users } from 'lucide-react'
import type { AudienceContactSummary } from '@/lib/email'

const STATUS_STYLES = {
  subscribed: 'bg-[#10B98115] text-admin-success',
  unsubscribed: 'bg-[#F59E0B15] text-admin-warning',
} as const

function formatDate(value: string) {
  return value.slice(0, 10)
}

export function SubscriberList({
  contacts,
  hasMore,
}: {
  contacts: AudienceContactSummary[]
  hasMore: boolean
}) {
  return (
    <section aria-labelledby="subscribers-heading">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 id="subscribers-heading" className="flex items-center gap-2 text-base font-semibold text-admin-text">
            <Users size={17} className="text-accent" />
            Subscribers
          </h2>
          <p className="mt-1 text-xs text-admin-text-tertiary">
            Contacts currently held in your Resend audience.
          </p>
        </div>
        <span className="rounded-full bg-admin-card px-2.5 py-1 text-xs text-admin-text-secondary">
          {contacts.length}
        </span>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-admin-border bg-admin-card p-10 text-center">
          <Mail size={22} className="mx-auto text-admin-text-tertiary" />
          <p className="mt-3 text-sm text-admin-text-secondary">No subscribers yet.</p>
          <p className="mt-1 text-xs text-admin-text-tertiary">
            New newsletter signups will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 border-b border-admin-border px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-admin-text-tertiary">
            <span>Email</span>
            <span>Status</span>
            <span>Joined</span>
          </div>
          <div className="divide-y divide-admin-border">
            {contacts.map((contact) => {
              const status = contact.unsubscribed ? 'unsubscribed' : 'subscribed'
              return (
                <div
                  key={contact.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-5 py-4 text-[13px]"
                >
                  <span className="min-w-0 truncate text-admin-text">{contact.email}</span>
                  <span
                    className={`rounded-xl px-2.5 py-1 text-[11px] font-medium capitalize ${STATUS_STYLES[status]}`}
                  >
                    {status}
                  </span>
                  <time dateTime={contact.createdAt} className="text-xs text-admin-text-tertiary">
                    {formatDate(contact.createdAt)}
                  </time>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {hasMore ? (
        <p className="mt-3 text-xs text-admin-text-tertiary">
          Showing the first 100 contacts. View the complete audience in Resend.
        </p>
      ) : null}
    </section>
  )
}
