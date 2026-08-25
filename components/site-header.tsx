'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
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

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 md:px-6 lg:px-12">
        <Link href="/" aria-label="Home">
          <LogoMark />
        </Link>
        <nav className="flex items-center gap-4 md:gap-8">
          <div className="hidden items-center gap-4 md:flex md:gap-8">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    active
                      ? 'bg-accent-dim text-accent'
                      : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
          <Link
            href="/blog?focus=search"
            aria-label="Search articles"
            className="text-text-secondary transition-colors hover:text-text-primary"
          >
            <Search size={18} />
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
