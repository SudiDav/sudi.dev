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

const LANGUAGES = [
  { locale: 'en', name: 'English' },
  { locale: 'fr', name: 'Français' },
] as const

function LanguageFlag({ locale }: { locale: SiteLocale }) {
  return (
    <svg aria-hidden="true" width="22" height="15" viewBox="0 0 60 30" preserveAspectRatio="none" className="rounded-sm">
      {locale === 'en' ? (
        <>
          <path fill="#012169" d="M0 0h60v30H0z" />
          <path stroke="#fff" strokeWidth="6" d="M0 0l60 30m0-30L0 30" />
          <path fill="#c8102e" d="M0 0v2.24L25.53 15H30zM60 0h-4.47L30 12.76V15zM60 30v-2.24L34.47 15H30zM0 30h4.47L30 17.24V15z" />
          <path stroke="#fff" strokeWidth="10" d="M30 0v30M0 15h60" />
          <path stroke="#c8102e" strokeWidth="6" d="M30 0v30M0 15h60" />
        </>
      ) : (
        <>
          <path fill="#002654" d="M0 0h20v30H0z" />
          <path fill="#fff" d="M20 0h20v30H20z" />
          <path fill="#ce1126" d="M40 0h20v30H40z" />
        </>
      )}
    </svg>
  )
}

const languageSegment = 'grid size-8 place-items-center rounded-full'

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
        <nav aria-label={french ? 'Navigation principale' : 'Main navigation'} className="flex items-center gap-2 md:gap-8">
          <div className="hidden items-center gap-4 md:flex md:gap-8">
            {NAV.map(navLink)}
          </div>
          <Link
            href={localePath(locale, '/blog?focus=search')}
            aria-label={french ? 'Rechercher des articles' : 'Search articles'}
            className="text-text-secondary transition-colors hover:text-text-primary"
          >
            <Search size={18} />
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle locale={locale} />
            <div
              role="group"
              aria-label={french ? 'Langue' : 'Language'}
              className="flex items-center gap-0.5 rounded-full border border-border bg-bg-card p-0.5"
            >
              {LANGUAGES.map(({ locale: option, name }) => option === locale ? (
                <span
                  key={option}
                  lang={option}
                  title={name}
                  aria-current="true"
                  className={`${languageSegment} bg-accent-dim ring-1 ring-inset ring-accent`}
                >
                  <LanguageFlag locale={option} />
                  <span className="sr-only">{name}</span>
                </span>
              ) : (
                <a
                  key={option}
                  href={switchHref}
                  hrefLang={option}
                  lang={option}
                  aria-label={name}
                  title={name}
                  className={`${languageSegment} opacity-75 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
                >
                  <LanguageFlag locale={option} />
                </a>
              ))}
            </div>
          </div>
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
        </nav>
      </div>
    </header>
  )
}
