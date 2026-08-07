import Link from 'next/link'
import { Search, Plus } from 'lucide-react'
import { AdminTopBar, StatusBadge } from '@/components/admin/admin-ui'
import { PostRowActions } from '@/components/admin/post-row-actions'
import { getAdminPosts, getAdminPostCounts } from '@/lib/admin-data'

/**
 * Design: "Admin — Posts" — a top bar with search and a New Post button, a
 * tab row of counts sitting on a 1px $admin-border bottom rule, then the table
 * card.
 *
 * The table is a real <table> with scoped headers rather than styled divs, and
 * it scrolls horizontally below `lg` instead of reflowing — the columns are
 * fixed widths in the design.
 */
const TABS = ['All Posts', 'Published', 'Drafts', 'Archived'] as const

/** Tab label → the status it filters to. "All Posts" filters nothing. */
const TAB_STATUS: Record<string, string | null> = {
  'All Posts': null,
  Published: 'Published',
  Drafts: 'Draft',
  Archived: 'Archived',
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = (TABS as readonly string[]).includes(tab ?? '') ? (tab as string) : 'All Posts'
  const [allPosts, counts] = await Promise.all([getAdminPosts(), getAdminPostCounts()])
  const wanted = TAB_STATUS[activeTab]
  const posts = wanted ? allPosts.filter((post) => post.status === wanted) : allPosts

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
        {counts.map((tab) => {
          const active = tab.label === activeTab
          return (
            <Link
              key={tab.label}
              href={tab.label === 'All Posts' ? '/admin/posts' : `/admin/posts?tab=${encodeURIComponent(tab.label)}`}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px flex items-center gap-1.5 px-4 py-2.5 text-[13px] ${
                active
                  ? 'border-b-2 border-accent font-semibold text-accent'
                  : 'text-admin-text-secondary hover:text-admin-text'
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
            </Link>
          )
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-admin-border bg-admin-card">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="bg-admin-subtle">
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
            {posts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-[13px] text-admin-text-secondary">
                  No {activeTab === 'All Posts' ? 'posts' : activeTab.toLowerCase()} yet.
                </td>
              </tr>
            ) : null}
            {posts.map((post) => (
              <tr key={post.id} className="border-t border-admin-border">
                <td className="px-5 py-4">
                  <span className="block size-4 rounded border-[1.5px] border-admin-border" />
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="text-[13px] font-medium text-admin-text hover:text-accent"
                    >
                      {post.title}
                    </Link>
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
                  <PostRowActions slug={post.id} title={post.title} status={post.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
