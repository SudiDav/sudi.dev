import Link from 'next/link'
import type { Post } from '@/lib/content.types'
import { formatPostDate } from '@/lib/format'

/**
 * Design: "Article Item" — COLUMN, padding [20,0], gap 8, 1px bottom border only.
 * Title Geist 17/600, excerpt Inter 14/1.5, meta row gap 16 in Geist Mono 12.
 *
 * The middot between date and read time is its own text node in the design, so
 * it is rendered as an element rather than a CSS separator.
 */
export function ArticleItem({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col gap-2 border-b border-border py-5">
      <h3 className="font-display text-[17px] font-semibold text-text-primary transition-colors group-hover:text-accent">
        {post.title}
      </h3>
      <p className="text-sm leading-[1.5] text-text-secondary">{post.excerpt}</p>
      <div className="flex items-center gap-4 font-mono text-xs text-text-tertiary">
        <span>{formatPostDate(post.date)}</span>
        <span>·</span>
        <span>{post.readingTime}</span>
      </div>
    </Link>
  )
}
