import Link from 'next/link'
import {
  Eye,
  FileText,
  MessageCircle,
  FolderKanban,
  Plus,
  FolderPlus,
  ChartBar,
  UserCog,
  Pencil,
} from 'lucide-react'
import { AdminTopBar, StatCard, AdminCard } from '@/components/admin/admin-ui'
import { getPosts, getProjects } from '@/lib/content'
import type { Post, Project } from '@/lib/content.types'
import { getAdminStats } from '@/lib/admin-data'

export const dynamic = 'force-dynamic'

/**
 * Design: "Stats Row" — four cards, gap 20.
 *
 * Published posts and projects are counted from the real content. Views stay
 * "—" because no analytics provider is connected; comments come from the
 * GitHub Discussions that power the site's giscus embed.
 */
function stats(counts: {
  posts: string
  projects: string
  comments: string
  commentsPeriod: string
}) {
  return [
    { label: 'Total Views', value: '—', trend: '', period: 'no analytics connected', Icon: Eye },
    {
      label: 'Published Posts',
      value: counts.posts,
      trend: '',
      period: 'in content/posts',
      Icon: FileText,
    },
    {
      label: 'Comments',
      value: counts.comments,
      trend: '',
      period: counts.commentsPeriod,
      Icon: MessageCircle,
    },
    {
      label: 'Projects',
      value: counts.projects,
      trend: '',
      period: 'in content/projects',
      Icon: FolderKanban,
      trendTone: 'accent' as const,
    },
  ]
}

/**
 * Design: "Recent Activity" — six rows of padding [14,0], gap 14, each with a
 * tinted icon wrap of padding 8 / radius 8.
 *
 * The design fills these with invented events — comments on posts that do not
 * exist, view milestones for a site with no analytics. They are built from the
 * real content instead: what was published, and when. A dashboard that invents
 * its own history is worse than one that admits it is quiet.
 */
function buildActivity(posts: Post[], projects: Project[]) {
  const entries = [
    ...posts.map((post) => ({
      Icon: FileText,
      tint: 'bg-accent-dim text-accent',
      text: `Published "${post.title}"`,
      at: post.date,
    })),
    ...projects.map((project) => ({
      Icon: FolderKanban,
      tint: 'bg-[#F59E0B15] text-admin-warning',
      text: `Added project "${project.title}"`,
      // Projects carry a year rather than a date; sort them from its start.
      at: `${project.year}-01-01`,
    })),
  ]

  return entries
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6)
    .map(({ at, ...rest }) => ({ ...rest, time: relativeDate(at) }))
}

/** "3 days ago" for anything recent, an absolute date once that stops helping. */
function relativeDate(iso: string) {
  const then = new Date(iso).getTime()
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/** Design: "Quick Actions" — a 320-wide card of four rows. */
const ACTIONS = [
  {
    Icon: Plus,
    label: 'New Blog Post',
    description: 'Create a new article draft',
    href: '/admin/posts',
  },
  {
    Icon: FolderPlus,
    label: 'Add Project',
    description: 'Showcase a new project',
    href: '/admin/projects/new',
  },
  {
    Icon: ChartBar,
    label: 'View Analytics',
    description: 'Check traffic & engagement',
    href: '/admin',
  },
  {
    Icon: UserCog,
    label: 'Edit Profile',
    description: 'Update your bio & links',
    href: '/admin/settings',
  },
]

export default async function AdminDashboardPage() {
  const [counts, posts, projects] = await Promise.all([
    getAdminStats(),
    getPosts(),
    getProjects(),
  ])
  const STATS = stats(counts)
  const activity = buildActivity(posts, projects)

  return (
    <>
      <AdminTopBar title="Dashboard" subtitle="Welcome back, Sudi. Here's what's happening." />

      <div className="flex flex-col gap-5 lg:flex-row">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        <AdminCard
          title="Recent Activity"
          className="flex-1"
          action={
            <Link href="/admin/posts" className="text-[13px] text-accent hover:underline">
              View all
            </Link>
          }
        >
          <div className="flex flex-col">
            {activity.map((item, index) => (
              <div
                key={item.text}
                className={`flex items-center gap-3.5 py-3.5 ${
                  index < activity.length - 1 ? 'border-b border-admin-border' : ''
                }`}
              >
                <span className={`rounded-lg p-2 ${item.tint}`}>
                  <item.Icon size={16} />
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[13px] text-admin-text">{item.text}</span>
                  <span className="text-[11px] text-admin-text-tertiary">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Quick Actions" className="w-full lg:w-[320px]">
          <div className="flex flex-col gap-4">
            {ACTIONS.map(({ Icon, label, description, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3.5 rounded-[10px] border border-admin-border px-4 py-3.5 transition-colors hover:bg-admin-bg"
              >
                <span className="rounded-lg bg-accent-dim p-2">
                  <Icon size={18} className="text-accent" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-admin-text">{label}</span>
                  <span className="text-[11px] text-admin-text-tertiary">{description}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Drafts — pinned to the card's bottom above a 1px top rule */}
          <div className="flex-1" />
          <div className="flex flex-col gap-3 border-t border-admin-border pt-4">
            <h3 className="text-[13px] font-semibold text-admin-text-secondary">Recent Drafts</h3>
            {counts.drafts.length === 0 ? (
              <span className="text-[13px] text-admin-text-tertiary">No drafts</span>
            ) : null}
            {counts.drafts.map((draft) => (
              <Link
                key={draft}
                href="/admin/posts"
                className="flex items-center gap-2 text-[13px] text-admin-text hover:text-accent"
              >
                <Pencil size={14} className="text-admin-text-tertiary" />
                {draft}
              </Link>
            ))}
          </div>
        </AdminCard>
      </div>
    </>
  )
}
