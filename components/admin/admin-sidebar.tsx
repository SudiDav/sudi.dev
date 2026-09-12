'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Mail,
  Menu,
  MessageCircle,
  Settings,
  X,
} from 'lucide-react'

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
  { href: '/admin/comments', label: 'Comments', Icon: MessageCircle },
  { href: '/admin/newsletters', label: 'Newsletters', Icon: Mail },
  { href: '/admin/settings', label: 'Settings', Icon: Settings },
]

type CloseableDialog = { open: boolean; close: () => void }
type ResponsiveQuery = {
  matches: boolean
  addEventListener: (type: 'change', listener: (event: { matches: boolean }) => void) => void
  removeEventListener: (type: 'change', listener: (event: { matches: boolean }) => void) => void
}

/** Prevent an open mobile dialog from leaving the desktop page inert after a resize. */
export function closeMobileNavOnDesktop(
  dialog: CloseableDialog,
  query: ResponsiveQuery,
  onClose: () => void,
) {
  const closeIfDesktop = ({ matches }: { matches: boolean }) => {
    if (!matches || !dialog.open) return
    dialog.close()
    onClose()
  }

  closeIfDesktop(query)
  query.addEventListener('change', closeIfDesktop)
  return () => query.removeEventListener('change', closeIfDesktop)
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/images/sudi-logo.png"
        alt="Sudi David"
        width={80}
        height={33}
        className={compact ? 'h-[27px] w-16 object-contain' : 'h-[33px] w-20 object-contain'}
      />
      <span className="font-mono text-[10px] tracking-[2px] text-admin-sidebar-text">ADMIN</span>
    </div>
  )
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 pt-4" aria-label="Admin navigation">
      {NAV.map(({ href, label, Icon }) => {
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors ${
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
  )
}

function Profile({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-admin-sidebar-hover pt-4">
      <span className="size-9 shrink-0 rounded-full bg-accent" />
      <div className="min-w-0 flex flex-col gap-0.5">
        <span className="truncate text-[13px] font-medium text-admin-sidebar-text-active">{name}</span>
        <span className="truncate text-[11px] text-admin-sidebar-text">{email}</span>
      </div>
    </div>
  )
}

export function AdminSidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const currentPage = NAV.find(({ href }) =>
    href === '/admin' ? pathname === href : pathname.startsWith(href),
  )?.label

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    return closeMobileNavOnDesktop(dialog, window.matchMedia('(min-width: 64rem)'), () =>
      setMenuOpen(false),
    )
  }, [])

  const openMenu = () => {
    setMenuOpen(true)
    dialogRef.current?.showModal()
  }

  const closeMenu = () => {
    dialogRef.current?.close()
    setMenuOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-admin-sidebar-hover bg-admin-sidebar px-4 sm:px-6 lg:hidden">
        <Logo compact />
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-admin-sidebar-text sm:inline">
            {currentPage ?? 'Admin'}
          </span>
          <button
            type="button"
            aria-label="Open admin navigation"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={openMenu}
            className="flex size-11 items-center justify-center rounded-lg text-admin-sidebar-text-active transition-colors hover:bg-admin-sidebar-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        aria-label="Mobile admin navigation"
        onClose={() => setMenuOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu()
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(21rem,calc(100vw-2rem))] max-w-none border-0 bg-transparent p-0 backdrop:bg-black/65 lg:hidden"
      >
        <div className="flex h-full flex-col bg-admin-sidebar px-5 py-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-admin-sidebar-hover pb-5">
            <Logo />
            <button
              type="button"
              aria-label="Close admin navigation"
              onClick={closeMenu}
              className="flex size-11 items-center justify-center rounded-lg text-admin-sidebar-text-active transition-colors hover:bg-admin-sidebar-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X size={22} />
            </button>
          </div>
          <NavLinks pathname={pathname} onNavigate={closeMenu} />
          <div className="flex-1" />
          <Profile name={name} email={email} />
        </div>
      </dialog>

      <aside className="hidden h-screen w-[260px] shrink-0 flex-col bg-admin-sidebar px-5 py-6 lg:sticky lg:top-0 lg:flex">
        <div className="pb-6">
          <Logo />
        </div>
        <NavLinks pathname={pathname} />
        <div className="flex-1" />
        <Profile name={name} email={email} />
      </aside>
    </>
  )
}
