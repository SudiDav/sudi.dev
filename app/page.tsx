import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  GithubIcon,
  TwitterIcon,
  LinkedinIcon,
  InstagramIcon,
} from '@/components/brand-icons'
import { OutboundLink } from '@/components/outbound-link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { FeaturedProjects } from '@/components/featured-projects/featured-projects'
import { ArticleItem } from '@/components/article-item'
import { TechBadge } from '@/components/tech-badge'
import { PortfolioWorld } from '@/components/world/portfolio-world'
import { PhilosophicalIdentity } from '@/components/philosophical-identity'
import { PortraitRelief } from '@/components/portrait-relief'
import { PortraitPuzzle } from '@/components/portrait-puzzle'
import portraitReliefManifest from '@/components/portrait-relief-manifest.json'
import { getPublishedPosts, getProjects } from '@/lib/content'
import { getSettings, socialUrl } from '@/lib/site'
import './home-room.css'

const TECH_STACK = ['C#', '.NET', 'TypeScript', 'React', 'NestJS', 'Vue', 'PostgreSQL', 'Docker', 'RabbitMQ']

export default async function HomePage() {
  const [posts, projects, settings] = await Promise.all([
    getPublishedPosts(),
    getProjects(),
    getSettings(),
  ])
  const socials = (
    [
      { kind: 'github' as const, label: 'GitHub', Icon: GithubIcon },
      { kind: 'twitter' as const, label: 'X', Icon: TwitterIcon },
      { kind: 'linkedin' as const, label: 'LinkedIn', Icon: LinkedinIcon },
      { kind: 'instagram' as const, label: 'Instagram', Icon: InstagramIcon },
    ] as const
  ).filter(({ kind }) => Boolean(settings.social[kind]))
  const featuredProjects = projects.slice(0, 3).map(({ slug, title, shortDescription, description, tech, year, category }) => ({
    slug,
    title,
    blurb: shortDescription ?? description,
    tech,
    year,
    category,
  }))
  const latestPosts = posts.slice(0, 4)

  return (
    <div className="home-portfolio-page flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        <section className="home-world-hero home-orbit-hero px-4 md:px-6 lg:px-12">
          <div className="home-world-intro">
            <PhilosophicalIdentity name={settings.displayName} />

            <p className="max-w-[46ch] text-base leading-[1.7] text-text-secondary">
              I help lending and PAYGO teams connect their systems and automate payment reconciliation.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href={`mailto:${settings.email}`}
                className="home-world-contact inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Discuss a project
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <Link
                href="/work"
                className="home-world-work-link inline-flex items-center px-2 py-3 text-sm transition-colors"
              >
                View My Work
              </Link>
            </div>

            <ul aria-label="Selected client work" className="home-world-proof max-w-[46ch] space-y-2 border-t pt-4 text-sm leading-relaxed">
              <li>
                <Link href="/work#altech-paygo" className="font-semibold underline underline-offset-4">Altech PAYGO</Link>
                {' · '}Connected field sales to accounting.
              </li>
              <li>
                <Link href="/work#chequepoint" className="font-semibold underline underline-offset-4">Chequepoint</Link>
                {' · '}Cut paperwork by 70% for AB Bank.
              </li>
            </ul>
          </div>
          <PortfolioWorld />
        </section>

        <FeaturedProjects projects={featuredProjects} />

        {/* Content Area — ROW, padding [0,48], gap 48 */}
        <div id="portfolio" className="flex scroll-mt-8 flex-col gap-12 px-4 md:px-6 lg:flex-row lg:px-12">
          <aside aria-label="Profile" className="home-profile">
            <PortraitPuzzle src={settings.avatar} name={settings.displayName}>
              {settings.avatar === portraitReliefManifest.source ? (
                <PortraitRelief
                  src={settings.avatar}
                  alt={settings.displayName}
                  expectedSourceSha256={portraitReliefManifest.sourceSha256}
                  sizes="(max-width: 639px) min(80vw, 276px), 272px"
                  priority={false}
                />
              ) : (
                <Image
                  src={settings.avatar}
                  alt={settings.displayName}
                  fill
                  sizes="(max-width: 639px) min(80vw, 276px), 272px"
                  className="home-profile__photo"
                />
              )}
            </PortraitPuzzle>

            <div className="home-profile__details">
              <p className="home-profile__availability">Available for work</p>
              <p className="text-sm leading-[1.65] text-text-secondary">{settings.bio}</p>

              <div className="home-profile__stack">
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  Tech stack
                </h2>
                <ul className="flex flex-wrap gap-1.5">
                  {TECH_STACK.map((tech) => <li key={tech}><TechBadge label={tech} /></li>)}
                </ul>
              </div>

              {socials.length > 0 && (
                <div className="home-profile__socials">
                  {socials.map(({ kind, label, Icon }) => (
                    <OutboundLink
                      key={label}
                      href={socialUrl(kind, settings.social[kind] ?? '')}
                      aria-label={label}
                      className="home-profile__social"
                    >
                      <Icon size={16} />
                    </OutboundLink>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Main Content — COLUMN, padding [32,0,48,0], gap 48 */}
          <div className="flex flex-1 flex-col gap-12 pb-12 lg:pt-8">
            <section className="flex flex-col gap-1">
              <div className="flex items-center justify-between pb-4">
                <h2 className="font-display text-2xl font-bold text-text-primary">
                  Latest Articles
                </h2>
                <Link href="/blog" className="text-[13px] font-medium text-accent hover:underline">
                  View all →
                </Link>
              </div>
              {latestPosts.map((post) => (
                // The homepage frame shows shorter copy for these same posts —
                // and a shorter title and read time for the featured one.
                <ArticleItem key={post.slug} post={{ ...post, ...post.home }} />
              ))}
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
