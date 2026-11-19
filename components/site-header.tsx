'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LogoMark } from './logo-mark'
import { ThemeToggle } from './theme-toggle'

const NAV = [
  { href: '/work', label: 'Work' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
]

/**
 * Design: "Header" — ROW, padding [16,48], space-between, 1px bottom border.
 * "Header Right" is a ROW gap 32; links are Inter 14/500.
 *
 * The inner-page frames show the current section's link in $accent rather than
 * $text-secondary, so the active route is derived from the pathname.
 *
 * Below `md` the links collapse — responsive behaviour is not in the design.
 */
export function SiteHeader() {
  const pathname = usePathname()
  const [openForPath, setOpenForPath] = useState<string | null>(null)
  const menuOpen = openForPath === pathname
  const menuButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpenForPath(null)
      menuButton.current?.focus()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const navLink = (item: typeof NAV[number]) => {
    const active = isCurrent(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        onClick={() => setOpenForPath(null)}
        className={`rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          active
            ? 'bg-accent-dim text-accent'
            : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
        }`}
      >
        {item.label}
      </Link>
    )
  }

  return (
    <header className="site-header border-b border-border">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 md:px-6 lg:px-12">
        <Link href="/" aria-label="Home">
          <LogoMark />
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-3 md:gap-8">
          <div className="hidden items-center gap-4 md:flex md:gap-8">
            {NAV.map(navLink)}
          </div>
          <Link
            href="/blog?focus=search"
            aria-label="Search articles"
            className="text-text-secondary transition-colors hover:text-text-primary"
          >
            <Search size={18} />
          </Link>
          <ThemeToggle />
          <button
            ref={menuButton}
            type="button"
            className="grid size-10 place-items-center rounded-full text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="site-mobile-navigation"
            onClick={() => setOpenForPath(menuOpen ? null : pathname)}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </nav>
      </div>
      <div
        id="site-mobile-navigation"
        className="mobile-navigation border-t border-border px-4 py-3 md:hidden"
        hidden={!menuOpen}
      >
        <nav aria-label="Mobile navigation" className="mx-auto flex max-w-[1440px] flex-col items-start gap-1">
          {NAV.map(navLink)}
        </nav>
      </div>
    </header>
  )
}
