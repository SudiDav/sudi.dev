import type { Metadata } from 'next'
import { Mail, FileText, Timer, Eye } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageIntro } from '@/components/page-intro'
import { FilterBar } from '@/components/filter-bar'
import { BlogSearch } from '@/components/blog-search'
import { FeaturedBlogCard } from '@/components/featured-blog-card'
import { ArticleItem } from '@/components/article-item'
import { TechBadge } from '@/components/tech-badge'
import { PAGE_GUTTER } from '@/components/layout'
import { getPosts } from '@/lib/content'
import { filterPostsByCategory, searchPosts, POST_FILTERS } from '@/lib/filters'

export const metadata: Metadata = {
  title: 'Blog | Sudi David',
  description: 'Thoughts on software engineering, developer tooling, and building for the web.',
}

/** Design: Blog Sidebar → "Topics", two rows of three. */
const TOPIC_ROWS = [
  ['React', 'TypeScript', 'DevOps'],
  ['Architecture', 'Rust', 'Go'],
]

/** Design: Blog Sidebar → "Reading Stats". The frame's own figures. */
const BLOG_STATS = [
  { Icon: FileText, label: 'Articles', value: '24' },
  { Icon: Timer, label: 'Avg. Read', value: '7 min' },
  { Icon: Eye, label: 'Total Views', value: '48.2K' },
]

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
  const featured = posts.find((post) => post.featured)
  const listed = searchPosts(
    filterPostsByCategory(
      posts.filter((post) => !post.featured),
      active,
    ),
    q,
  )

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
            {/* Newsletter — presentational, as designed */}
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-bg-card p-6">
              <Mail size={20} className="text-accent" />
              <h2 className="font-display text-base font-bold text-text-primary">Stay Updated</h2>
              <p className="text-[13px] leading-[1.5] text-text-secondary">
                Get notified when I publish new articles. No spam, unsubscribe anytime.
              </p>
              <input
                type="email"
                aria-label="Email address"
                placeholder="your@email.com"
                className="rounded-md border border-border bg-bg-primary px-3.5 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-border-hover focus:outline-none"
              />
              <button
                type="button"
                className="rounded-md bg-accent py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Subscribe
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] font-semibold tracking-[1.5px] text-text-tertiary">
                TOPICS
              </h2>
              {TOPIC_ROWS.map((row) => (
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
              {BLOG_STATS.map(({ Icon, label, value }) => (
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
