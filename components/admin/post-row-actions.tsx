'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Eye } from 'lucide-react'
import { setPostStatus } from '@/app/admin/actions'
import type { AdminPostStatus } from '@/lib/admin-fixtures'

const NEXT_STATUS: Record<AdminPostStatus, AdminPostStatus> = {
  Published: 'Draft',
  Draft: 'Published',
  Archived: 'Draft',
}

/**
 * Row actions for the posts table.
 *
 * The design draws a single ellipsis. A dropdown behind it would need focus
 * trapping, Escape handling and click-away management to be usable by keyboard;
 * three inline controls give the same actions with none of that machinery, and
 * every one is reachable by tab.
 */
export function PostRowActions({
  slug,
  title,
  status,
}: {
  slug: string
  title: string
  status: AdminPostStatus
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const next = NEXT_STATUS[status]

  const toggle = () => {
    setError(null)
    startTransition(async () => {
      const result = await setPostStatus(slug, next)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? <span className="text-[11px] text-admin-danger">{error}</span> : null}

      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        title={`Mark "${title}" as ${next}`}
        className="rounded-md border border-admin-border px-2 py-1 text-[11px] font-medium text-admin-text-secondary transition-colors hover:bg-admin-bg disabled:opacity-50"
      >
        {pending ? '…' : next}
      </button>

      <Link
        href={`/blog/${slug}`}
        aria-label={`View ${title} on the site`}
        className="text-admin-text-tertiary hover:text-admin-text"
      >
        <Eye size={16} />
      </Link>

      <Link
        href={`/admin/posts/${slug}/edit`}
        aria-label={`Edit ${title}`}
        className="text-admin-text-tertiary hover:text-admin-text"
      >
        <Pencil size={16} />
      </Link>
    </div>
  )
}
