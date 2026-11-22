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
import { getBookingUrl, getLocalizedSiteSettings, socialUrl } from '@/lib/site'
import { localePath, type SiteLocale } from '@/lib/locale'
import './home-room.css'

const TECH_STACK = ['C#', '.NET', 'TypeScript', 'React', 'NestJS', 'Vue', 'PostgreSQL', 'Docker', 'RabbitMQ']

export async function HomeView({ locale }: { locale: SiteLocale }) {
  const french = locale === 'fr'
  const [posts, projects, settings] = await Promise.all([
    getPublishedPosts(locale),
    getProjects(locale),
    getLocalizedSiteSettings(locale),
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
  const bookingUrl = getBookingUrl(settings, locale)
  const subject = french ? 'Appel de 30 minutes pour mon projet' : 'Free 30-minute project call'
  const mail = `mailto:${settings.email}?subject=${encodeURIComponent(subject)}`
  const ContactAction = bookingUrl ? OutboundLink : 'a'

  return (
    <div className="home-portfolio-page flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader locale={locale} />

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        <section className="home-world-hero home-orbit-hero px-4 md:px-6 lg:px-12">
          <div className="home-world-intro">
            <PhilosophicalIdentity name={settings.displayName} locale={locale} />

            <p className="max-w-[46ch] text-base leading-[1.7] text-text-secondary">
              {french ? 'J’aide les équipes à créer de nouveaux logiciels et à améliorer les systèmes qu’elles utilisent déjà.' : 'I help teams build new software and improve the systems they already use.'}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#contact"
                className="home-world-contact inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {french ? 'Parlons de votre projet' : 'Discuss a project'}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <Link
                href={localePath(locale, '/work')}
                className="home-world-work-link inline-flex items-center px-2 py-3 text-sm transition-colors"
              >
                {french ? 'Voir mes projets' : 'View My Work'}
              </Link>
            </div>
          </div>
          <PortfolioWorld locale={locale} />
        </section>

        <FeaturedProjects projects={featuredProjects} locale={locale} />

        <section
          id="contact"
          aria-labelledby="contact-title"
          className="scroll-mt-8 border-y border-border bg-bg-secondary px-4 py-10 md:px-6 lg:px-12"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="contact-title" className="font-display text-2xl font-bold text-text-primary">
                {french ? 'Vous avez un projet en tête ?' : 'Have a project in mind?'}
              </h2>
              <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-text-secondary">
                {french
                  ? 'Parlez-moi de ce que vous souhaitez créer ou améliorer. Nous pourrons discuter de votre idée et de la façon de la concrétiser.'
                  : 'Tell me what you’d like to build or improve. We can talk through your idea and what it would take to get started.'}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:shrink-0">
              <ContactAction
                href={bookingUrl ?? mail}
                className="home-world-contact inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                {bookingUrl
                  ? (french ? 'Réserver un appel gratuit de 30 minutes' : 'Book a free 30-minute call')
                  : (french ? 'Demander un appel gratuit de 30 minutes' : 'Request a free 30-minute call')}
                <ArrowRight size={16} aria-hidden="true" />
              </ContactAction>
              <a href={mail} className="text-sm text-text-secondary underline-offset-4 hover:underline">{settings.email}</a>
            </div>
          </div>
        </section>

        {/* Content Area — ROW, padding [0,48], gap 48 */}
        <div id="portfolio" className="flex scroll-mt-8 flex-col gap-12 px-4 md:px-6 lg:flex-row lg:px-12">
          <aside aria-label={french ? 'Profil' : 'Profile'} className="home-profile">
            <PortraitPuzzle src={settings.avatar} name={settings.displayName} locale={locale}>
              {settings.avatar === portraitReliefManifest.source ? (
                <PortraitRelief
                  src={settings.avatar}
                  alt={settings.displayName}
                  locale={locale}
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
              <p className="home-profile__availability">{french ? 'Disponible pour de nouveaux projets' : 'Available for work'}</p>
              <p className="text-sm leading-[1.65] text-text-secondary">{settings.bio}</p>

              <div className="home-profile__stack">
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  {french ? 'Technologies' : 'Tech stack'}
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
                  {french ? 'Derniers articles' : 'Latest Articles'}
                </h2>
                <Link href={localePath(locale, '/blog')} className="text-[13px] font-medium text-accent hover:underline">
                  {french ? 'Tout voir →' : 'View all →'}
                </Link>
              </div>
              {latestPosts.map((post) => (
                // The homepage frame shows shorter copy for these same posts —
                // and a shorter title and read time for the featured one.
                <ArticleItem key={post.slug} post={{ ...post, ...post.home }} locale={locale} />
              ))}
            </section>
          </div>
        </div>
      </main>

      <SiteFooter locale={locale} />
    </div>
  )
}
