import Link from 'next/link'
import { Search, Plus, Ellipsis } from 'lucide-react'
import { AdminTopBar, StatusBadge } from '@/components/admin/admin-ui'
import { adminPosts, adminPostCounts } from '@/lib/admin-fixtures'

/**
 * Design: "Admin — Posts" — a top bar with search and a New Post button, a
 * tab row of counts sitting on a 1px $admin-border bottom rule, then the table
 * card.
 *
 * The table is a real <table> with scoped headers rather than styled divs, and
 * it scrolls horizontally below `lg` instead of reflowing — the columns are
 * fixed widths in the design.
 */
export default function AdminPostsPage() {
  return (
    <>
      <AdminTopBar title="Posts">
        <div className="flex items-center gap-2 rounded-lg border border-admin-border bg-admin-card px-3.5 py-2">
          <Search size={16} className="text-admin-text-tertiary" />
          <span className="text-[13px] text-admin-text-tertiary">Search posts...</span>
        </div>
        <Link
          href="/admin/posts/new/edit"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          New Post
        </Link>
      </AdminTopBar>

      {/* Filter Row — tabs on a shared bottom rule; the active tab carries a 2px accent underline */}
      <div className="flex flex-wrap border-b border-admin-border">
        {adminPostCounts.map((tab, index) => {
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
              <span>{tab.label}</span>
              <span
                className={`rounded-[10px] px-2 py-0.5 text-[11px] font-normal ${
                  active ? 'bg-accent-dim text-accent' : 'bg-admin-border text-admin-text-secondary'
                }`}
              >
                {tab.value}
              </span>
            </button>
          )
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-admin-border bg-admin-card">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th scope="col" className="w-10 px-5 py-3">
                <span className="sr-only">Select</span>
                <span className="block size-4 rounded border-[1.5px] border-admin-border" />
              </th>
              {['TITLE', 'STATUS', 'DATE', 'VIEWS', 'COMMENTS'].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-5 py-3 text-xs font-semibold tracking-[1px] text-admin-text-secondary"
                >
                  {heading}
                </th>
              ))}
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {adminPosts.map((post) => (
              <tr key={post.id} className="border-t border-admin-border">
                <td className="px-5 py-4">
                  <span className="block size-4 rounded border-[1.5px] border-admin-border" />
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium text-admin-text">{post.title}</span>
                    <span className="text-[11px] text-admin-text-tertiary">{post.category}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={post.status} />
                </td>
                <td className="px-5 py-4 text-[13px] text-admin-text-secondary">{post.date}</td>
                <td className="px-5 py-4 text-[13px] text-admin-text-secondary">{post.views}</td>
                <td className="px-5 py-4 text-[13px] text-admin-text-secondary">{post.comments}</td>
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    aria-label={`Edit ${post.title}`}
                    className="inline-flex text-admin-text-tertiary hover:text-admin-text"
                  >
                    <Ellipsis size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
