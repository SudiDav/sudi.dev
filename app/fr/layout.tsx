import type { Metadata } from 'next'
import { SiteDocument } from '@/app/site-document'
import { languageAlternates } from '@/lib/locale'
import { buildSiteMetadata } from '@/lib/seo'
import { getLocalizedSiteSettings } from '@/lib/site'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getLocalizedSiteSettings('fr')
  const metadata = buildSiteMetadata(settings)
  return {
    ...metadata,
    alternates: { canonical: '/fr', languages: languageAlternates('/') },
    openGraph: { ...metadata.openGraph, locale: 'fr_CD', alternateLocale: 'en_US', url: '/fr' },
  }
}

export default function FrenchLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument locale="fr">{children}</SiteDocument>
}
