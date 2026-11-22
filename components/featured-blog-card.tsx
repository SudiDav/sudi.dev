import Image from 'next/image'
import Link from 'next/link'
import type { Post } from '@/lib/content.types'
import { formatPostDate } from '@/lib/format'
import { localePath, type SiteLocale } from '@/lib/locale'
import './featured-blog-card.css'

/**
 * Design: "Featured Blog Card" — ROW, height 320, clip, fill $bg-card, 1px
 * $border, cornerRadius 8, outer shadow 0/4/16 #00000015. A 380px image pane,
 * then a body of padding 32 / gap 16, vertically centred.
 *
 * The category badge shows "DEVELOPMENT" while the blog's filter pills read
 * "Development" — same stored value, uppercased here in CSS.
 */
export function FeaturedBlogCard({ post, locale = 'en' }: { post: Post; locale?: SiteLocale }) {
  const french = locale === 'fr'
  const category = french
    ? ({ Craft: 'Pratiques', Life: 'Vie', Philosophy: 'Philosophie' }[post.category] ?? post.category)
    : post.category
  return (
    <Link
      href={localePath(locale, `/blog/${post.slug}`)}
      className="featured-book group"
      aria-label={french ? `Lire ${post.title}` : `Read ${post.title}`}
    >
      <span className="featured-book__pages" aria-hidden="true" />
      <span className="featured-book__cover">
        <Image
          src={post.cover}
          alt=""
          fill
          sizes="(max-width: 768px) 68vw, 360px"
          className="featured-book__art"
        />
        <span className="featured-book__shade" />
        <span className="featured-book__cover-copy">
          <span className="featured-book__category">{category}</span>
          <span className="featured-book__title">{post.title}</span>
          <span className="featured-book__rule" />
          <span className="featured-book__author">Sudi M. David</span>
        </span>
      </span>
      <span className="featured-book__spine" aria-hidden="true" />
      <span className="sr-only">
        {post.title}. {post.excerpt} {french ? 'Publié le' : 'Published'} {formatPostDate(post.date, locale)} · {post.readingTime}.
      </span>
    </Link>
  )
}
