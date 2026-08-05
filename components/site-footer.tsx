import Link from 'next/link'
import { GithubIcon, TwitterIcon, LinkedinIcon } from './brand-icons'

const LINKS = [
  { href: '/rss.xml', label: 'RSS' },
  { href: '/privacy', label: 'Privacy' },
  { href: 'https://github.com/sudidavid', label: 'Source' },
]

const SOCIALS = [
  { href: 'https://github.com/sudidavid', label: 'GitHub', Icon: GithubIcon },
  { href: 'https://twitter.com/sudidavid', label: 'Twitter', Icon: TwitterIcon },
  { href: 'https://linkedin.com/in/sudidavid', label: 'LinkedIn', Icon: LinkedinIcon },
]

/**
 * Design: "Footer" — ROW, padding [32,48], space-between, 1px top border.
 * Copyright is Geist Mono 12 in $text-tertiary; the right group is a ROW gap 24
 * with Inter 13 links and 16px icons in $text-tertiary.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:gap-0 md:px-6 lg:px-12">
        <p className="font-mono text-xs text-text-tertiary">
          © 2026 sudi.dev — Built with caffeine &amp; curiosity
        </p>
        <div className="flex items-center gap-6">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[13px] text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-4">
            {SOCIALS.map(({ href, label, Icon }) => (
              <Link
                key={label}
                href={href}
                aria-label={label}
                className="text-text-tertiary transition-colors hover:text-text-primary"
              >
                <Icon size={16} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
