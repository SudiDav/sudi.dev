import type { Metadata } from 'next'
import { Inter, Geist, Geist_Mono } from 'next/font/google'
import { getSettings } from '@/lib/site'
import { buildSiteMetadata } from '@/lib/seo'
import { Analytics } from '@vercel/analytics/next'
import { themeBootstrapScript } from '@/lib/theme'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return buildSiteMetadata(settings)
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The font variables must live on <html>, not <body>. Tailwind's `@theme`
    // defines `--font-sans: var(--font-inter)` at `:root` — if `--font-inter`
    // is only declared on <body>, that reference resolves to nothing at :root
    // and every font silently falls back to the system stack.
    <html
      lang="en"
      className={`${inter.variable} ${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="antialiased">
        {children}
        {/*
          Vercel Web Analytics. Cookieless: visitors are identified by a hash of
          the request that resets daily, so nobody is followed between days or
          across sites. It is the only measurement on the site, and the privacy
          page says so.
        */}
        <Analytics />
      </body>
    </html>
  )
}
