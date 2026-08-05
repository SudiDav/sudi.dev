import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { GithubIcon, TwitterIcon, LinkedinIcon } from '@/components/brand-icons'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ProjectCard } from '@/components/project-card'
import { ArticleItem } from '@/components/article-item'
import { TechBadge } from '@/components/tech-badge'
import { getPosts, getProjects } from '@/lib/content'

/** Design: Hero → "Code Snippet", two absolutely-positioned offset cards. */
const CODE_LINES = [
  { text: 'const dev = {', accent: false },
  { text: '  name: "Sudi",', accent: true },
  { text: '  loves: "clean code",', accent: true },
  { text: '  coffee: true,', accent: true },
  { text: '};', accent: false },
]

function CodeSnippet({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute hidden flex-col gap-1.5 rounded-lg border border-border bg-bg-card px-5 py-4 opacity-50 shadow-[0_4px_16px_#00000020] xl:flex ${className}`}
    >
      {CODE_LINES.map((line) => (
        <span
          key={line.text}
          className={`whitespace-pre font-mono text-xs ${line.accent ? 'text-accent' : 'text-text-secondary'}`}
        >
          {line.text}
        </span>
      ))}
    </div>
  )
}

/** Design: Sidebar → "Tech Stack", three rows of badges. */
const TECH_ROWS = [
  ['React', 'TypeScript'],
  ['Node.js', 'Go', 'Docker'],
  ['PostgreSQL', 'Redis'],
]

const SOCIALS = [
  { href: 'https://github.com/sudidavid', label: 'GitHub', Icon: GithubIcon },
  { href: 'https://twitter.com/sudidavid', label: 'Twitter', Icon: TwitterIcon },
  { href: 'https://linkedin.com/in/sudidavid', label: 'LinkedIn', Icon: LinkedinIcon },
]

export default async function HomePage() {
  const [posts, projects] = await Promise.all([getPosts(), getProjects()])
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
            Hi, I&apos;m Sudi David
          </h1>

          <p className="text-lg leading-[1.4] text-text-secondary lg:text-xl">
            Full-Stack Developer &amp; Open Source Enthusiast
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

          <CodeSnippet className="top-10 left-[920px]" />
          <CodeSnippet className="top-[203px] left-[1019px]" />
        </section>

        {/* Content Area — ROW, padding [0,48], gap 48 */}
        <div className="flex flex-col gap-12 px-4 md:px-6 lg:flex-row lg:px-12">
          {/* Sidebar — COLUMN, 260w, gap 28, right border */}
          <aside className="flex w-full shrink-0 flex-col gap-7 py-8 lg:w-[260px] lg:border-r lg:border-border lg:pr-8">
            <Image
              src="/images/generated-1784965046774.png"
              alt="Sudi David"
              width={80}
              height={80}
              className="size-20 rounded-full border border-border object-cover"
            />

            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-accent" />
              <span className="font-mono text-xs text-text-tertiary">Available for work</span>
            </div>

            <p className="text-sm leading-[1.6] text-text-secondary">
              Building things for the web. Passionate about developer tools, performance, and clean
              architecture.
            </p>

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
              {SOCIALS.map(({ href, label, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-bg-card text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
                >
                  <Icon size={16} />
                </Link>
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
                <ArticleItem key={post.slug} post={post} />
              ))}
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
