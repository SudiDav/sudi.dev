import type { Metadata } from 'next'
import { FileText, Timer, Eye } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageIntro } from '@/components/page-intro'
import { FilterBar } from '@/components/filter-bar'
import { BlogSearch } from '@/components/blog-search'
import { FeaturedBlogCard } from '@/components/featured-blog-card'
import { ArticleItem } from '@/components/article-item'
import { TechBadge } from '@/components/tech-badge'
import { NewsletterForm } from '@/components/newsletter-form'
import { PAGE_GUTTER } from '@/components/layout'
import { getPosts } from '@/lib/content'
import type { Post } from '@/lib/content.types'
import { listBlogPosts, POST_FILTERS } from '@/lib/filters'

export const metadata: Metadata = {
  title: 'Blog | Sudi M. David',
  description: 'Thoughts on software engineering, developer tooling, and building for the web.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: '/blog',
    title: 'Blog | Sudi M. David',
    description: 'Thoughts on software engineering, developer tooling, and building for the web.',
  },
}

/**
 * Design: Blog Sidebar → "Topics", two rows of three.
 *
 * The design lists React, Rust, Go and Architecture — none of which anything
 * here is written about. Taken from the posts' own tags instead, most frequent
 * first, so the sidebar can only ever advertise writing that exists.
 */
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

/**
 * Design: Blog Sidebar → "Reading Stats", drawn as 24 articles / 7 min / 48.2K
 * views.
 *
 * Those were the frame's own figures and every one of them was false here: the
 * article count was wrong, and there is no analytics on this site at all, so
 * the view total was a number with nothing behind it. Publishing an invented
 * audience size is worse than publishing none.
 *
 * Articles and average read time are computed from the posts. "Topics" replaces
 * views because it is something the site can actually know.
 */
function buildBlogStats(posts: Post[]) {
  const minutes = posts
    .map((post) => Number.parseInt(post.readingTime, 10))
    .filter((n) => Number.isFinite(n))
  const average = minutes.length
    ? Math.round(minutes.reduce((sum, n) => sum + n, 0) / minutes.length)
    : 0

  return [
    { Icon: FileText, label: 'Articles', value: String(posts.length) },
    { Icon: Timer, label: 'Avg. Read', value: `${average} min` },
    {
      Icon: Eye,
      label: 'Topics',
      value: String(new Set(posts.map((post) => post.category)).size),
    },
  ]
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>
}) {
  const { category, q = '' } = await searchParams
  const active = POST_FILTERS.includes(category as (typeof POST_FILTERS)[number])
    ? (category as string)
    : 'All'

  const posts = await getPosts()
  // Describes the whole blog, so it counts every post rather than the filtered view.
  const blogStats = buildBlogStats(posts)
  const topicRows = buildTopicRows(posts)
  const featured = posts.find((post) => post.featured)
  const listed = listBlogPosts(posts, active, q)

  // The pinned post is the design's featured slot; it is hidden once the reader
  // narrows the list, since it would otherwise ignore their filter.
  const showFeatured = featured && active === 'All' && !q.trim()

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        <PageIntro
          segment="blog"
          title="Blog"
          subtitle="Thoughts on software engineering, developer tooling, and building for the web."
        />

        {/* Search & Filters — ROW, space-between, gap 16 */}
        <div
          className={`flex flex-col justify-between gap-4 lg:flex-row lg:items-center ${PAGE_GUTTER}`}
        >
          <BlogSearch query={q} />
          <FilterBar
            options={POST_FILTERS}
            active={active}
            label="Filter articles by category"
            size="blog"
          />
        </div>

        {showFeatured ? (
          <section className={`flex flex-col gap-3 pt-8 pb-4 ${PAGE_GUTTER}`}>
            <h2 className="font-mono text-[11px] font-semibold tracking-[1.5px] text-text-tertiary">
              PINNED
            </h2>
            <FeaturedBlogCard post={featured} />
          </section>
        ) : null}

        {/* Blog Content — ROW, gap 48: article list + 300px sidebar */}
        <div className={`flex flex-col gap-12 pt-8 pb-12 lg:flex-row ${PAGE_GUTTER}`}>
          <div className="flex flex-1 flex-col gap-1">
            {listed.length === 0 ? (
              <p className="py-12 text-sm text-text-secondary">
                No articles match that search yet.
              </p>
            ) : (
              listed.map((post) => <ArticleItem key={post.slug} post={post} />)
            )}
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-8 lg:w-[300px]">
            <NewsletterForm />

            <div className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] font-semibold tracking-[1.5px] text-text-tertiary">
                TOPICS
              </h2>
              {topicRows.map((row) => (
                <div key={row.join()} className="flex flex-wrap gap-2">
                  {row.map((topic) => (
                    <TechBadge key={topic} label={topic} />
                  ))}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] font-semibold tracking-[1.5px] text-text-tertiary">
                THIS BLOG
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

      <SiteFooter />
    </div>
  )
}
