import type { Metadata } from 'next'
import { getPublishedPost, getPublishedPosts } from '@/lib/content'
import { ArticleView, articleMetadata } from '../views'

export async function generateStaticParams() {
  return (await getPublishedPosts()).map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPost(slug)
  if (!post) return {}
  const paired = Boolean(await getPublishedPost(slug, 'fr'))
  return articleMetadata(post, 'en', paired)
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return ArticleView({ slug, locale: 'en' })
}
