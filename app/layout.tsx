import type { Metadata } from 'next'
import { Inter, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Sudi David — Developer Portfolio',
  description: 'Full-stack engineer building real-time systems and developer tools.',
}

const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    if (theme === 'light') document.documentElement.classList.add('light');
  } catch (e) {}
})();
`

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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
