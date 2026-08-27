import type { Metadata } from 'next'
import { SITE_URL, type SiteSettings } from './site'

export const SEO_IMAGE_PATH = '/opengraph-image'

/** Build the shared identity metadata used by the public site layout. */
export function buildSiteMetadata(settings: SiteSettings): Metadata {
  const { displayName } = settings
  const { title, description } = settings.seo

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${displayName}`,
    },
    description,
    keywords: [
      'Sudi M. David',
      'Sudi David',
      'full-stack engineer',
      'software engineer',
      'fintech',
      'DRC developer',
    ],
    authors: [{ name: displayName, url: SITE_URL }],
    creator: displayName,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName: displayName,
      title,
      description,
      images: [
        {
          url: SEO_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: `${displayName} — ${title.replace(`${displayName} — `, '')}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: settings.social.twitter.startsWith('@')
        ? settings.social.twitter
        : `@${settings.social.twitter}`,
      images: [SEO_IMAGE_PATH],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  }
}
