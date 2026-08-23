'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, FolderKanban, Settings } from 'lucide-react'

/**
 * Design: Admin frames → "Sidebar" — COLUMN, 260 wide, padding [24,20],
 * fill $admin-sidebar. A logo row with an "ADMIN" tag, the nav group
 * (gap 4), a spacer, then the profile row above a 1px $admin-sidebar-hover
 * top border.
 *
 * Nav items are 220-wide rows of padding [10,16], gap 12, radius 8, with a
 * 20px icon and an Inter 14 label. The active item takes $accent on the icon
 * and $admin-sidebar-text-active on the label.
 */
const NAV = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/posts', label: 'Posts', Icon: FileText },
  { href: '/admin/projects', label: 'Projects', Icon: FolderKanban },
  { href: '/admin/settings', label: 'Settings', Icon: Settings },
]

export function AdminSidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname()

  return (
    <aside className="flex w-full shrink-0 flex-col bg-admin-sidebar px-5 py-6 lg:w-[260px]">
      <div className="flex items-center gap-3 pb-6">
        <Image
          src="/images/sudi-logo.png"
          alt="Sudi David"
          width={80}
          height={33}
          className="h-[33px] w-20 object-contain"
        />
        <span className="font-mono text-[10px] tracking-[2px] text-admin-sidebar-text">ADMIN</span>
      </div>

      <nav className="flex flex-col gap-1 pt-4">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-admin-sidebar-active text-admin-sidebar-text-active'
                  : 'text-admin-sidebar-text hover:bg-admin-sidebar-hover'
              }`}
            >
              <Icon size={20} className={active ? 'text-accent' : 'text-admin-sidebar-text'} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-3 border-t border-admin-sidebar-hover pt-4">
        <span className="size-9 shrink-0 rounded-full bg-accent" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium text-admin-sidebar-text-active">{name}</span>
          <span className="text-[11px] text-admin-sidebar-text">{email}</span>
        </div>
      </div>
    </aside>
  )
}
