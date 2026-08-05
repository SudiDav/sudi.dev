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
} from 'lucide-react'
import { AdminTopBar, StatCard, AdminCard } from '@/components/admin/admin-ui'

/** Design: "Stats Row" — four cards, gap 20. */
const STATS = [
  { label: 'Total Views', value: '24,891', trend: '+12.5%', period: 'from last month', Icon: Eye },
  {
    label: 'Published Posts',
    value: '18',
    trend: '+3',
    period: 'from last month',
    Icon: FileText,
  },
  {
    label: 'Comments',
    value: '142',
    trend: '+24',
    period: 'from last month',
    Icon: MessageCircle,
  },
  {
    label: 'Projects',
    value: '8',
    trend: '+1',
    period: 'from last month',
    Icon: FolderKanban,
    trendTone: 'accent' as const,
  },
]

/**
 * Design: "Recent Activity" — six rows of padding [14,0], gap 14, each with a
 * tinted icon wrap of padding 8 / radius 8.
 */
const ACTIVITY = [
  {
    Icon: FileText,
    tint: 'bg-accent-dim text-accent',
    text: 'Published "Building a Real-Time Collaboration Engine"',
    time: '2 hours ago',
  },
  {
    Icon: MessageCircle,
    tint: 'bg-[#8B5CF610] text-[#8B5CF6]',
    text: 'New comment on "Optimizing React Renders at Scale"',
    time: '5 hours ago',
  },
  {
    Icon: Eye,
    tint: 'bg-[#10B98115] text-admin-success',
    text: '"Type-Safe API Layers" reached 1,000 views',
    time: '1 day ago',
  },
  {
    Icon: FolderKanban,
    tint: 'bg-[#F59E0B15] text-admin-warning',
    text: 'Updated project "CollabSync" status to featured',
    time: '2 days ago',
  },
  {
    Icon: MessageCircle,
    tint: 'bg-[#8B5CF610] text-[#8B5CF6]',
    text: 'New comment on "From Monolith to Microservices"',
    time: '3 days ago',
  },
  {
    Icon: FileText,
    tint: 'bg-accent-dim text-accent',
    text: 'Draft saved: "Event Sourcing in Practice"',
    time: '4 days ago',
  },
]

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

export default function AdminDashboardPage() {
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
            {ACTIVITY.map((item, index) => (
              <div
                key={item.text}
                className={`flex items-center gap-3.5 py-3.5 ${
                  index < ACTIVITY.length - 1 ? 'border-b border-admin-border' : ''
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
        </AdminCard>
      </div>
    </>
  )
}
