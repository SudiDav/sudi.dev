import Image from 'next/image'
import Link from 'next/link'
import type { Post } from '@/lib/content.types'
import { formatPostDate } from '@/lib/format'

/**
 * Design: "Featured Blog Card" — ROW, height 320, clip, fill $bg-card, 1px
 * $border, cornerRadius 8, outer shadow 0/4/16 #00000015. A 380px image pane,
 * then a body of padding 32 / gap 16, vertically centred.
 *
 * The category badge shows "DEVELOPMENT" while the blog's filter pills read
 * "Development" — same stored value, uppercased here in CSS.
 */
export function FeaturedBlogCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-bg-card shadow-[0_4px_16px_#00000015] transition-colors hover:border-border-hover md:h-80 md:flex-row"
    >
      <div className="relative h-48 w-full shrink-0 bg-bg-elevated md:h-auto md:w-[380px]">
        <Image
          src={post.cover}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, 380px"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col justify-center gap-4 p-8">
        <span className="w-fit rounded-full bg-accent-dim px-2.5 py-1 font-mono text-[11px] font-semibold text-accent uppercase">
          {post.category}
        </span>
        <h2 className="font-display text-2xl leading-[1.3] font-bold text-text-primary transition-colors group-hover:text-accent">
          {post.title}
        </h2>
        <p className="text-sm leading-[1.5] text-text-secondary">{post.excerpt}</p>
        <div className="flex items-center gap-4 font-mono text-xs text-text-tertiary">
          <span>{formatPostDate(post.date)}</span>
          <span>·</span>
          <span>{post.readingTime}</span>
        </div>
      </div>
    </Link>
  )
}
