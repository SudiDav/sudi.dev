import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, User } from 'lucide-react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ArticleItem } from '@/components/article-item'
import { ArticleComments } from '@/components/article-comments'
import { getPost, getPosts } from '@/lib/content'
import { formatPostDate } from '@/lib/format'

export async function generateStaticParams() {
  return (await getPosts()).map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const post = await getPost((await params).slug)
  if (!post) return {}
  return { title: `${post.title} | Sudi David`, description: post.excerpt }
}

/**
 * Design: "Article Body" — COLUMN, padding [48,360], gap 28. Paragraphs are
 * Inter 17/1.8 in $text-secondary, H2s are Geist 28/700 in $text-primary, and
 * the blockquote is italic with a 3px left border in $accent.
 */
const mdxComponents = {
  h2: (props: React.ComponentProps<'h2'>) => (
    <h2 className="font-display text-[28px] font-bold text-text-primary" {...props} />
  ),
  h3: (props: React.ComponentProps<'h3'>) => (
    <h3 className="font-display text-xl font-bold text-text-primary" {...props} />
  ),
  p: (props: React.ComponentProps<'p'>) => (
    <p className="text-[17px] leading-[1.8] text-text-secondary" {...props} />
  ),
  blockquote: (props: React.ComponentProps<'blockquote'>) => (
    <blockquote
      className="border-l-[3px] border-accent pl-5 text-[17px] leading-[1.8] text-text-secondary italic"
      {...props}
    />
  ),
  ul: (props: React.ComponentProps<'ul'>) => (
    <ul className="list-disc pl-6 text-[17px] leading-[1.8] text-text-secondary" {...props} />
  ),
  a: (props: React.ComponentProps<'a'>) => (
    <a className="text-accent underline underline-offset-2" {...props} />
  ),
  pre: (props: React.ComponentProps<'pre'>) => (
    <pre
      className="overflow-x-auto rounded-lg border border-border bg-bg-card p-6 font-mono text-[13px] leading-[1.6] text-text-secondary"
      {...props}
    />
  ),
  code: (props: React.ComponentProps<'code'>) => <code className="font-mono" {...props} />,
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const related = (await getPosts()).filter((other) => other.slug !== post.slug).slice(0, 2)

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
            <span className="text-accent">{post.slug}</span>
          </nav>

          <span className="rounded-full bg-accent-dim px-3 py-1 font-mono text-[11px] font-semibold text-accent uppercase">
            {post.category}
          </span>

          <h1 className="font-display text-3xl leading-[1.2] font-bold text-text-primary lg:text-[42px]">
            {post.title}
          </h1>

          <p className="text-base leading-[1.5] text-text-secondary lg:text-lg">{post.excerpt}</p>

          <div className="flex items-center gap-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-bg-elevated">
              <User size={18} className="text-text-tertiary" />
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-text-primary">Sudi David</span>
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
          <MDXRemote source={post.body} components={mdxComponents} />
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
