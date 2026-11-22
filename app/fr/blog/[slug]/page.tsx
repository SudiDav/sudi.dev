import type { Metadata } from 'next'
import { getPublishedPost, getPublishedPosts } from '@/lib/content'
import { ArticleView, articleMetadata } from '../../../(english)/blog/views'

export async function generateStaticParams() {
  return (await getPublishedPosts('fr')).map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPost(slug, 'fr')
  if (!post) return {}
  const paired = Boolean(await getPublishedPost(slug, 'en'))
  return articleMetadata(post, 'fr', paired)
}

export default async function FrenchArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return ArticleView({ slug, locale: 'fr' })
}
