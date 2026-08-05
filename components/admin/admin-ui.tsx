import type { LucideIcon } from 'lucide-react'
import { Search, Bell } from 'lucide-react'
import type { AdminPostStatus } from '@/lib/admin-fixtures'

/**
 * Design: Admin "Top Bar" — ROW, space-between. A title column (Geist 26/700
 * over Inter 14 in $admin-text-secondary), then a search box of padding [8,14]
 * and a notification button of padding 8, both $admin-card with a 1px
 * $admin-border and radius 8.
 */
export function AdminTopBar({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold text-admin-text">{title}</h1>
        {subtitle ? <p className="text-sm text-admin-text-secondary">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        {children ?? (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-admin-border bg-admin-card px-3.5 py-2">
              <Search size={16} className="text-admin-text-tertiary" />
              <span className="text-[13px] text-admin-text-tertiary">Search...</span>
            </div>
            <span className="rounded-lg border border-admin-border bg-admin-card p-2">
              <Bell size={18} className="text-admin-text-secondary" />
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Design: "Stat Card" — COLUMN, padding 24, gap 12, fill $admin-card, 1px
 * $admin-border, radius 12. Label Inter 13, value Geist 32/700, then a footer
 * pairing a coloured trend with Inter 12 period text.
 */
export function StatCard({
  label,
  value,
  trend,
  period,
  Icon,
  trendTone = 'success',
}: {
  label: string
  value: string
  trend: string
  period: string
  Icon: LucideIcon
  trendTone?: 'success' | 'accent'
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-xl border border-admin-border bg-admin-card p-6">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-admin-text-secondary">{label}</span>
        <Icon size={18} className="text-admin-text-tertiary" />
      </div>
      <span className="font-display text-[32px] font-bold text-admin-text">{value}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={`text-xs font-semibold ${
            trendTone === 'accent' ? 'text-accent' : 'text-admin-success'
          }`}
        >
          {trend}
        </span>
        <span className="text-xs text-admin-text-tertiary">{period}</span>
      </div>
    </div>
  )
}

/**
 * Design: "Status Badge" — padding [4,10], gap 6, radius 12, with a 6px dot.
 * The published variant is a literal #10B98115 fill over $admin-success; the
 * draft and archived variants follow the same shape using $admin-warning and
 * $admin-text-tertiary.
 */
const STATUS_STYLES: Record<AdminPostStatus, { wrap: string; dot: string }> = {
  Published: { wrap: 'bg-[#10B98115] text-admin-success', dot: 'bg-admin-success' },
  Draft: { wrap: 'bg-[#F59E0B15] text-admin-warning', dot: 'bg-admin-warning' },
  Archived: { wrap: 'bg-[#9CA3AF15] text-admin-text-tertiary', dot: 'bg-admin-text-tertiary' },
}

export function StatusBadge({ status }: { status: AdminPostStatus }) {
  const style = STATUS_STYLES[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium ${style.wrap}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  )
}

/** Design: the admin cards — $admin-card, 1px $admin-border, radius 12. */
export function AdminCard({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`flex flex-col gap-5 rounded-xl border border-admin-border bg-admin-card p-6 ${className}`}
    >
      {title ? (
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-admin-text">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}
