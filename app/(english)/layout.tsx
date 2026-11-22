import type { Metadata } from 'next'
import { getSettings } from '@/lib/site'
import { buildSiteMetadata } from '@/lib/seo'
import { SiteDocument } from '@/app/site-document'
import { languageAlternates } from '@/lib/locale'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return { ...buildSiteMetadata(settings), alternates: { canonical: '/', languages: languageAlternates('/') } }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument locale="en">{children}</SiteDocument>
}
