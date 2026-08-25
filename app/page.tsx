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
import { ProjectCard } from '@/components/project-card'
import { ArticleItem } from '@/components/article-item'
import { TechBadge } from '@/components/tech-badge'
import { HeroConstellation } from '@/components/hero-constellation'
import { getPosts, getProjects } from '@/lib/content'
import { getSettings, socialUrl } from '@/lib/site'

/** Design: Sidebar → "Tech Stack", three rows of badges. */
const TECH_ROWS = [
  ['C#', '.NET', 'TypeScript'],
  ['React', 'NestJS', 'Vue'],
  ['PostgreSQL', 'Docker', 'RabbitMQ'],
]

export default async function HomePage() {
  const [posts, projects, settings] = await Promise.all([
    getPosts(),
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
  const featuredProjects = projects.slice(0, 3)
  const latestPosts = posts.slice(0, 4)

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        {/* Hero — COLUMN, padding [80,48,64,48], gap 24 */}
        <section className="relative flex flex-col gap-6 px-4 pt-20 pb-16 md:px-6 lg:px-12">
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="text-accent">~$</span>
            <span className="text-text-tertiary">whoami</span>
          </div>

          <h1 className="font-display text-4xl leading-[1.1] font-bold text-text-primary sm:text-5xl lg:text-[52px]">
            Hi, I&apos;m {settings.displayName}
          </h1>

          {/*
            The design puts a one-line job title here. It says nothing a hundred
            other portfolios do not, so it carries an actual position instead —
            the same shape as the frame, more words, one idea.
          */}
          <p className="max-w-[46ch] text-lg leading-[1.5] text-text-secondary lg:text-xl">
            I&apos;m drawn to philosophy and conspiracy theories. Why admit that on a portfolio?
            Because both begin where debugging begins —{' '}
            <span className="text-text-primary">refusing the official explanation</span> — and only
            one of them lets you run the experiment.
          </p>

          <p className="max-w-[46ch] text-[15px] leading-[1.6] text-text-tertiary">
            I build the systems institutions run on: banking, lending, agriculture, schools.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/work"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              View My Work
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-primary transition-colors hover:border-border-hover"
            >
              Read Blog
            </Link>
          </div>

          <HeroConstellation />
        </section>

        {/* Content Area — ROW, padding [0,48], gap 48 */}
        <div className="flex flex-col gap-12 px-4 md:px-6 lg:flex-row lg:px-12">
          {/* Sidebar — COLUMN, 260w, gap 28, right border */}
          <aside className="flex w-full shrink-0 flex-col gap-7 py-8 lg:w-[260px] lg:border-r lg:border-border lg:pr-8">
            {/*
              The design draws this at 80px. Enlarged deliberately — with a real
              portrait rather than a placeholder, 80px was too small to read as
              a face at a glance.
            */}
            <Image
              src={settings.avatar}
              alt={settings.displayName}
              width={192}
              height={192}
              priority
              className="size-48 rounded-full border border-border object-cover"
            />

            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-accent" />
              <span className="font-mono text-xs text-text-tertiary">Available for work</span>
            </div>

            <p className="text-sm leading-[1.6] text-text-secondary">{settings.bio}</p>

            <div className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] font-semibold tracking-[1.5px] text-text-tertiary">
                TECH STACK
              </h2>
              {TECH_ROWS.map((row) => (
                <div key={row.join()} className="flex flex-wrap gap-2">
                  {row.map((tech) => (
                    <TechBadge key={tech} label={tech} />
                  ))}
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              {socials.map(({ kind, label, Icon }) => (
                <OutboundLink
                  key={label}
                  href={socialUrl(kind, settings.social[kind] ?? '')}
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-bg-card text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
                >
                  <Icon size={16} />
                </OutboundLink>
              ))}
            </div>
          </aside>

          {/* Main Content — COLUMN, padding [32,0,48,0], gap 48 */}
          <div className="flex flex-1 flex-col gap-12 pb-12 lg:pt-8">
            <section className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-text-primary">
                  Featured Projects
                </h2>
                <Link href="/work" className="text-[13px] font-medium text-accent hover:underline">
                  View all →
                </Link>
              </div>
              <div className="flex flex-col gap-4 md:flex-row">
                {featuredProjects.map((project) => (
                  <ProjectCard key={project.slug} project={project} />
                ))}
              </div>
            </section>

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
