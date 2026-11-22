'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LogoMark } from './logo-mark'
import { ThemeToggle } from './theme-toggle'
import { localePath, publicPath, type SiteLocale } from '@/lib/locale'

const NAV = [
  { href: '/work', label: { en: 'Work', fr: 'Projets' } },
  { href: '/blog', label: { en: 'Blog', fr: 'Blog' } },
  { href: '/about', label: { en: 'About', fr: 'À propos' } },
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
export function SiteHeader({ locale = 'en', languagePath }: {
  locale?: SiteLocale
  languagePath?: string
} = {}) {
  const french = locale === 'fr'
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

  const otherLocale = french ? 'en' : 'fr'
  const switchHref = localePath(otherLocale, languagePath ?? publicPath(pathname))
  const switchLanguage = (
    <a
      href={switchHref}
      hrefLang={otherLocale}
      lang={otherLocale}
      className="rounded-full px-2.5 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {french ? 'English' : 'Français'}
    </a>
  )
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const navLink = (item: typeof NAV[number]) => {
    const href = localePath(locale, item.href)
    const active = isCurrent(href)
    return (
      <Link
        key={item.href}
        href={href}
        aria-current={active ? 'page' : undefined}
        onClick={() => setOpenForPath(null)}
        className={`rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          active
            ? 'bg-accent-dim text-accent'
            : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
        }`}
      >
        {item.label[locale]}
      </Link>
    )
  }

  return (
    <header className="site-header border-b border-border">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 md:px-6 lg:px-12">
        <Link href={localePath(locale, '/')} aria-label={french ? 'Accueil' : 'Home'}>
          <LogoMark />
        </Link>
        <nav aria-label={french ? 'Navigation principale' : 'Main navigation'} className="flex items-center gap-3 md:gap-8">
          <div className="hidden items-center gap-4 md:flex md:gap-8">
            {NAV.map(navLink)}
            {switchLanguage}
          </div>
          <Link
            href={localePath(locale, '/blog?focus=search')}
            aria-label={french ? 'Rechercher des articles' : 'Search articles'}
            className="text-text-secondary transition-colors hover:text-text-primary"
          >
            <Search size={18} />
          </Link>
          <ThemeToggle locale={locale} />
          <button
            ref={menuButton}
            type="button"
            className="grid size-10 place-items-center rounded-full text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
            aria-label={menuOpen ? (french ? 'Fermer le menu' : 'Close navigation menu') : (french ? 'Ouvrir le menu' : 'Open navigation menu')}
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
        <nav aria-label={french ? 'Navigation mobile' : 'Mobile navigation'} className="mx-auto flex max-w-[1440px] flex-col items-start gap-1">
          {NAV.map(navLink)}
          {switchLanguage}
        </nav>
      </div>
    </header>
  )
}
