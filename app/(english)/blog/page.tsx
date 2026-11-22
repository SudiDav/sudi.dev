import type { Metadata } from 'next'
import { localizedMetadata } from '@/lib/locale'
import { BlogIndexView } from './views'

const title = 'Blog | Sudi M. David'
const description = 'Thoughts on software engineering, developer tooling, and building for the web.'

export const metadata: Metadata = localizedMetadata('en', '/blog', title, description)

export default function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>
}) {
  return BlogIndexView({ locale: 'en', searchParams })
}
