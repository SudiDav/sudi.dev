import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, AtSign } from 'lucide-react'
import { GithubIcon } from '@/components/brand-icons'
import { OutboundLink } from '@/components/outbound-link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ArticleItem } from '@/components/article-item'
import { ArticleComments } from '@/components/article-comments'
import { TechBadge } from '@/components/tech-badge'
import { getPublishedPost, getPublishedPosts } from '@/lib/content'
import { getSettings, socialUrl } from '@/lib/site'
import { formatPostDate } from '@/lib/format'
import { ArticleBody } from '@/components/article-body'

export async function generateStaticParams() {
  return (await getPublishedPosts()).map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug)
  if (!post) return {}
  const canonical = `/blog/${post.slug}`
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title: post.title,
      description: post.excerpt,
      publishedTime: new Date(`${post.date}T00:00:00Z`).toISOString(),
      authors: ['https://sudi.dev'],
      tags: post.tags,
      images: [{ url: post.cover, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.cover],
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPublishedPost(slug)
  if (!post) notFound()

  const [related, settings] = await Promise.all([
    getPublishedPosts().then((all) => all.filter((other) => other.slug !== post.slug).slice(0, 2)),
    getSettings(),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        {/* Article Header — COLUMN, padding [48,360,32,360], gap 20, centred */}
        <header className="flex flex-col items-center gap-5 px-4 pt-12 pb-8 text-center md:px-8 lg:px-40 xl:px-90">
          <nav className="flex items-center gap-3 font-mono text-xs" aria-label="Breadcrumb">
            <span className="text-text-tertiary">~</span>
            <span className="text-text-tertiary">/</span>
            <Link href="/blog" className="text-text-tertiary hover:text-text-primary">
              blog
            </Link>
            <span className="text-text-tertiary">/</span>
            <span className="text-accent">{post.breadcrumb ?? post.slug}</span>
          </nav>

          <span className="rounded-full bg-accent-dim px-3 py-1 font-mono text-[11px] font-semibold text-accent uppercase">
            {post.category}
          </span>

          <h1 className="font-display text-3xl leading-[1.2] font-bold text-text-primary lg:text-[42px]">
            {post.title}
          </h1>

          <p className="text-base leading-[1.5] text-text-secondary lg:text-lg">
            {post.subtitle ?? post.excerpt}
          </p>

          <div className="flex items-center gap-4">
            <Image
              src={settings.avatar}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-full object-cover"
            />
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-text-primary">
                {settings.displayName}
              </span>
              <span className="text-sm text-text-tertiary">·</span>
              <span className="font-mono text-[13px] text-text-tertiary">
                {formatPostDate(post.date)}
              </span>
              <span className="text-sm text-text-tertiary">·</span>
              <span className="font-mono text-[13px] text-text-tertiary">{post.readingTime}</span>
            </div>
          </div>
        </header>

        {/* Cover Wrap — ROW, padding [0,120], centred; image 400h, radius 12 */}
        <div className="px-4 md:px-8 lg:px-30">
          <div className="relative h-60 w-full overflow-hidden rounded-xl bg-bg-elevated lg:h-100">
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

        {/* Article Body — COLUMN, padding [48,360], gap 28 */}
        <div className="flex flex-col gap-7 px-4 py-12 md:px-8 lg:px-40 xl:px-90">
          <ArticleBody body={post.body} />

          {post.tags?.length ? (
            <>
              {/* Divider — ROW, padding [8,0] */}
              <div className="py-2">
                <hr className="border-0 border-t border-border" />
              </div>

              {/* Tags Row — ROW, gap 8 */}
              <div className="flex flex-wrap items-center gap-2">
                {post.tags.map((tag) => (
                  <TechBadge key={tag} label={tag} />
                ))}
              </div>
            </>
          ) : null}

          {/* Author Bio Card — ROW, padding 24, gap 20, radius 12 */}
          <div className="flex items-center gap-5 rounded-xl border border-border bg-bg-card p-6">
            <Image
              src={settings.avatar}
              alt=""
              width={56}
              height={56}
              className="size-14 shrink-0 rounded-full object-cover"
            />
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] tracking-[2px] text-text-tertiary">
                WRITTEN BY
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {settings.displayName}
              </span>
              <p className="text-sm leading-[1.6] text-text-secondary">{settings.bio}</p>
              <div className="flex flex-wrap items-center gap-5">
                <OutboundLink
                  href={socialUrl('twitter', settings.social.twitter)}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-accent hover:underline"
                >
                  <AtSign size={14} />
                  {settings.social.twitter}
                </OutboundLink>
                <OutboundLink
                  href={socialUrl('github', settings.social.github)}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-accent hover:underline"
                >
                  <GithubIcon size={14} />
                  {settings.social.github}
                </OutboundLink>
              </div>
            </div>
          </div>
        </div>

        <ArticleComments />

        {/* Related Articles — COLUMN, padding [48,80], gap 32, fill $bg-secondary */}
        <section className="flex flex-col gap-8 bg-bg-secondary px-4 py-12 md:px-20">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-text-primary">
              Related Articles
            </h2>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              All articles
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {related.map((other) => (
              <ArticleItem key={other.slug} post={other} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
