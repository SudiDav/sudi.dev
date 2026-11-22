import type { Metadata } from 'next'
import { localizedMetadata } from '@/lib/locale'
import { BlogIndexView } from '../../(english)/blog/views'

const title = 'Blog | Sudi M. David'
const description = 'Des réflexions sur le génie logiciel, les outils de développement et la création pour le web.'

export const metadata: Metadata = localizedMetadata('fr', '/blog', title, description)

export default function FrenchBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>
}) {
  return BlogIndexView({ locale: 'fr', searchParams })
}
