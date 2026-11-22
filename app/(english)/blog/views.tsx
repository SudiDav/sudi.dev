import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, AtSign, Eye, FileText, Timer } from 'lucide-react'
import { GithubIcon } from '@/components/brand-icons'
import { OutboundLink } from '@/components/outbound-link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ArticleItem } from '@/components/article-item'
import { ArticleComments } from '@/components/article-comments'
import { TechBadge } from '@/components/tech-badge'
import { BlogSearch } from '@/components/blog-search'
import { FeaturedBlogCard } from '@/components/featured-blog-card'
import { FilterBar } from '@/components/filter-bar'
import { NewsletterForm } from '@/components/newsletter-form'
import { PAGE_GUTTER } from '@/components/layout'
import { ArticleBody } from '@/components/article-body'
import { getPublishedPost, getPublishedPosts } from '@/lib/content'
import type { Post } from '@/lib/content.types'
import { localePath, type SiteLocale } from '@/lib/locale'
import { getLocalizedSiteSettings, getSettings, socialUrl } from '@/lib/site'
import { formatPostDate } from '@/lib/format'
import { listBlogPosts, POST_FILTERS, selectFeaturedPost } from '@/lib/filters'
import './blog-room.css'
import './article-room.css'

const CATEGORY_LABELS: Record<string, string> = {
  All: 'Tout',
  Craft: 'Pratiques',
  Life: 'Vie',
  Philosophy: 'Philosophie',
}

const TAG_LABELS: Record<string, string> = {
  Action: 'Action',
  Africa: 'Afrique',
  AI: 'IA',
  Attention: 'Attention',
  Career: 'Carrière',
  Communication: 'Communication',
  'Distributed Systems': 'Systèmes distribués',
  Faith: 'Foi',
  Focus: 'Concentration',
  Life: 'Vie',
  Messaging: 'Messagerie',
  Observability: 'Observabilité',
  Performance: 'Performance',
  Philosophy: 'Philosophie',
  Presence: 'Présence',
  Tracing: 'Traçage',
  '.NET': '.NET',
  'ASP.NET Core': 'ASP.NET Core',
  'C#': 'C#',
  'EF Core': 'EF Core',
  MailKit: 'MailKit',
  'Minimal APIs': 'Minimal APIs',
  OpenTelemetry: 'OpenTelemetry',
  PostgreSQL: 'PostgreSQL',
  SQLite: 'SQLite',
}

export const categoryLabel = (category: string, locale: SiteLocale) =>
  locale === 'fr' ? (CATEGORY_LABELS[category] ?? category) : category
export const tagLabel = (tag: string, locale: SiteLocale) =>
  locale === 'fr' ? (TAG_LABELS[tag] ?? tag) : tag

function buildTopicRows(posts: Post[]) {
  const counts = new Map<string, number>()
  for (const tag of posts.flatMap((post) => post.tags ?? [])) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([tag]) => tag)

  return [top.slice(0, 3), top.slice(3, 6)].filter((row) => row.length > 0)
}

function buildBlogStats(posts: Post[], locale: SiteLocale) {
  const minutes = posts
    .map((post) => Number.parseInt(post.readingTime, 10))
    .filter((n) => Number.isFinite(n))
  const average = minutes.length
    ? Math.round(minutes.reduce((sum, n) => sum + n, 0) / minutes.length)
    : 0

  return [
    { Icon: FileText, label: 'Articles', value: String(posts.length) },
    { Icon: Timer, label: locale === 'fr' ? 'Lecture moyenne' : 'Avg. Read', value: `${average} min` },
    {
      Icon: Eye,
      label: locale === 'fr' ? 'Thèmes' : 'Topics',
      value: String(new Set(posts.map((post) => post.category)).size),
    },
  ]
}

export async function BlogIndexView({
  locale,
  searchParams,
}: {
  locale: SiteLocale
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>
}) {
  const french = locale === 'fr'
  const { category, q } = await searchParams
  const query = Array.isArray(q) ? (q[0] ?? '') : (q ?? '')
  const active = POST_FILTERS.includes(category as (typeof POST_FILTERS)[number])
    ? (category as string)
    : 'All'

  const posts = await getPublishedPosts(locale)
  const blogStats = buildBlogStats(posts, locale)
  const topicRows = buildTopicRows(posts)
  const featured = selectFeaturedPost(posts)
  const listed = listBlogPosts(posts, active, query)
  const showFeatured = featured && active === 'All' && !query.trim()
  const deskReading = showFeatured
    ? posts.filter((post) => post.slug !== featured.slug).slice(0, 3)
    : []
  const visibleArticles = showFeatured
    ? listed.filter((post) => !deskReading.some((deskPost) => deskPost.slug === post.slug))
    : listed
  const filterLabels = french
    ? CATEGORY_LABELS
    : undefined

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader locale={locale} />

      <main className="reading-desk-page mx-auto w-full max-w-[1440px] flex-1">
        <section
          className={`reading-desk-featured ${PAGE_GUTTER} ${showFeatured ? '' : 'reading-desk-featured--compact'}`}
          aria-label={french ? 'Espace de lecture du blog' : 'Blog reading desk'}
        >
          <div className="reading-desk-featured__intro">
            <h1 className="reading-desk-featured__title">Blog</h1>
            <p>
              {french
                ? 'Des réflexions sur les logiciels, les systèmes et la dimension humaine de leur création.'
                : 'Thoughts on software, systems, and the human side of building things.'}
            </p>
          </div>
          {showFeatured ? (
            <div className="reading-desk-featured__book">
              <FeaturedBlogCard post={featured} locale={locale} />
            </div>
          ) : null}
          {showFeatured ? (
            <div className="reading-desk-featured__reading">
              <h2 className="reading-desk-reading__heading">
                {french ? 'Articles récents' : 'Recent articles'}
              </h2>
              <ul className="reading-desk-list">
                {deskReading.map((post) => (
                  <li key={post.slug}>
                    <Link href={localePath(locale, `/blog/${post.slug}`)} className="reading-desk-list__link">
                      <span className="reading-desk-list__title">{post.title}</span>
                      <span className="reading-desk-list__meta">
                        {categoryLabel(post.category, locale)} <span aria-hidden="true">·</span> {post.readingTime}
                      </span>
                      <span className="reading-desk-list__arrow" aria-hidden="true">↗</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <a className="reading-desk-featured__all" href="#all-articles">
                {french ? 'Parcourir les archives' : 'Browse the archive'} <span aria-hidden="true">→</span>
              </a>
            </div>
          ) : null}
        </section>

        <div
          className={`reading-desk-tools flex flex-col justify-between gap-4 pt-7 lg:flex-row lg:items-center ${PAGE_GUTTER}`}
        >
          <BlogSearch query={query} locale={locale} />
          <FilterBar
            options={POST_FILTERS}
            active={active}
            label={french ? 'Filtrer les articles par catégorie' : 'Filter articles by category'}
            size="blog"
            labels={filterLabels}
          />
        </div>

        <div id="all-articles" className={`reading-desk-index flex flex-col gap-12 pt-8 pb-12 lg:flex-row ${PAGE_GUTTER}`}>
          <div className="flex flex-1 flex-col gap-1">
            {visibleArticles.length === 0 ? (
              showFeatured ? null : (
                <p className="py-12 text-sm text-text-secondary">
                  {french ? 'Aucun article ne correspond à cette recherche pour le moment.' : 'No articles match that search yet.'}
                </p>
              )
            ) : (
              visibleArticles.map((post) => <ArticleItem key={post.slug} post={post} locale={locale} />)
            )}
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-8 lg:w-[300px]">
            <NewsletterForm locale={locale} />

            <div className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] font-semibold tracking-[1.5px] text-text-tertiary">
                {french ? 'THÈMES' : 'TOPICS'}
              </h2>
              {topicRows.map((row) => (
                <div key={row.join()} className="flex flex-wrap gap-2">
                  {row.map((topic) => <TechBadge key={topic} label={tagLabel(topic, locale)} />)}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] font-semibold tracking-[1.5px] text-text-tertiary">
                {french ? 'CE BLOG' : 'THIS BLOG'}
              </h2>
              {blogStats.map(({ Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2.5">
                  <span className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                    <Icon size={14} className="text-text-tertiary" />
                    {label}
                  </span>
                  <span className="font-mono text-[13px] font-semibold text-text-primary">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter locale={locale} />
    </div>
  )
}

export async function ArticleView({ slug, locale }: { slug: string; locale: SiteLocale }) {
  const french = locale === 'fr'
  const post = await getPublishedPost(slug, locale)
  if (!post) notFound()

  const [related, settings, hasFrenchPair] = await Promise.all([
    getPublishedPosts(locale).then((all) => all.filter((other) => other.slug !== post.slug).slice(0, 2)),
    french ? getLocalizedSiteSettings('fr') : getSettings(),
    french ? Promise.resolve(true) : getPublishedPost(post.slug, 'fr').then(Boolean),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader locale={locale} languagePath={!french && !hasFrenchPair ? '/blog' : undefined} />

      <main className="article-reading-room mx-auto w-full max-w-[1440px] flex-1">
        <header className="article-reading-room__header flex flex-col items-center gap-5 px-4 pt-12 pb-8 text-center md:px-8 lg:px-40 xl:px-90">
          <nav className="flex items-center gap-3 font-mono text-xs" aria-label={french ? 'Fil d’Ariane' : 'Breadcrumb'}>
            <span className="text-text-tertiary">~</span>
            <span className="text-text-tertiary">/</span>
            <Link href={localePath(locale, '/blog')} className="text-text-tertiary hover:text-text-primary">
              blog
            </Link>
            <span className="text-text-tertiary">/</span>
            <span className="text-accent">{post.breadcrumb ?? post.slug}</span>
          </nav>

          <span className="rounded-full bg-accent-dim px-3 py-1 font-mono text-[11px] font-semibold text-accent uppercase">
            {categoryLabel(post.category, locale)}
          </span>

          <h1 className="font-display text-3xl leading-[1.2] font-bold text-text-primary lg:text-[42px]">
            {post.title}
          </h1>

          <p className="text-base leading-[1.5] text-text-secondary lg:text-lg">
            {post.subtitle ?? post.excerpt}
          </p>

          <div className="flex items-center gap-4">
            <Image src={settings.avatar} alt="" width={40} height={40} className="size-10 rounded-full object-cover" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-text-primary">{settings.displayName}</span>
              <span className="text-sm text-text-tertiary">·</span>
              <span className="font-mono text-[13px] text-text-tertiary">{formatPostDate(post.date, locale)}</span>
              <span className="text-sm text-text-tertiary">·</span>
              <span className="font-mono text-[13px] text-text-tertiary">{post.readingTime}</span>
            </div>
          </div>
        </header>

        <div className="article-reading-room__cover-wrap px-4 md:px-8 lg:px-30">
          <div className="article-reading-room__cover relative h-60 w-full overflow-hidden rounded-2xl bg-bg-elevated lg:h-100">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              sizes="(max-width: 1024px) 100vw, 1200px"
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="article-reading-room__paper flex flex-col gap-7 px-4 py-12 md:px-8 lg:px-40 xl:px-90">
          <ArticleBody body={post.body} locale={locale} />

          {post.tags?.length ? (
            <>
              <div className="py-2"><hr className="border-0 border-t border-border" /></div>
              <div className="flex flex-wrap items-center gap-2">
                {post.tags.map((tag) => <TechBadge key={tag} label={tagLabel(tag, locale)} />)}
              </div>
            </>
          ) : null}

          <div className="flex items-center gap-5 rounded-2xl border border-border bg-bg-card p-6">
            <Image src={settings.avatar} alt="" width={56} height={56} className="size-14 shrink-0 rounded-full object-cover" />
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] tracking-[2px] text-text-tertiary">
                {french ? 'ÉCRIT PAR' : 'WRITTEN BY'}
              </span>
              <span className="text-sm font-semibold text-text-primary">{settings.displayName}</span>
              <p className="text-sm leading-[1.6] text-text-secondary">{settings.bio}</p>
              <div className="flex flex-wrap items-center gap-5">
                <OutboundLink href={socialUrl('twitter', settings.social.twitter)} className="inline-flex items-center gap-1.5 font-mono text-xs text-accent hover:underline">
                  <AtSign size={14} />
                  {settings.social.twitter}
                </OutboundLink>
                <OutboundLink href={socialUrl('github', settings.social.github)} className="inline-flex items-center gap-1.5 font-mono text-xs text-accent hover:underline">
                  <GithubIcon size={14} />
                  {settings.social.github}
                </OutboundLink>
              </div>
            </div>
          </div>
        </div>

        <ArticleComments locale={locale} slug={post.slug} />

        <section className="flex flex-col gap-8 bg-bg-secondary px-4 py-12 md:px-20">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-text-primary">
              {french ? 'Articles similaires' : 'Related Articles'}
            </h2>
            <Link href={localePath(locale, '/blog')} className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
              {french ? 'Tous les articles' : 'All articles'}
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {related.map((other) => <ArticleItem key={other.slug} post={other} locale={locale} />)}
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </div>
  )
}

export function articleMetadata(post: Post, locale: SiteLocale, paired: boolean): Metadata {
  const path = `/blog/${post.slug}`
  const canonical = localePath(locale, path)
  const languageAlternates = paired ? { en: path, fr: localePath('fr', path) } : undefined
  const description = post.excerpt
  return {
    title: post.title,
    description,
    alternates: { canonical, languages: languageAlternates },
    openGraph: {
      type: 'article',
      url: canonical,
      title: post.title,
      description,
      locale: locale === 'fr' ? 'fr_CD' : 'en_US',
      alternateLocale: paired ? (locale === 'fr' ? 'en_US' : 'fr_CD') : undefined,
      publishedTime: new Date(`${post.date}T00:00:00Z`).toISOString(),
      authors: ['https://sudi.dev'],
      tags: post.tags,
      images: [{ url: post.cover, alt: post.title }],
    },
    twitter: { card: 'summary_large_image', title: post.title, description, images: [post.cover] },
  }
}
