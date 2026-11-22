import { Inter, Geist, Geist_Mono } from 'next/font/google'
import { SiteAnalytics } from '@/components/site-analytics'
import { themeBootstrapScript } from '@/lib/theme'
import type { SiteLocale } from '@/lib/locale'
import '@/app/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export function SiteDocument({ children, locale }: { children: React.ReactNode; locale: SiteLocale }) {
  return (
    <html
      lang={locale}
      className={`${inter.variable} ${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="antialiased">
        {children}
        <SiteAnalytics cloudflare={process.env.HOSTING_PROVIDER === 'cloudflare'} />
      </body>
    </html>
  )
}
