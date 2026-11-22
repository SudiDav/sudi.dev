import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export default function FrenchNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader locale="fr" languagePath="/" />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-16 md:px-8 lg:px-30">
        <h1 className="font-display text-3xl font-bold text-text-primary">Page introuvable</h1>
        <Link href="/fr" className="mt-4 inline-block font-semibold text-text-primary underline underline-offset-4">
          Retour à l’accueil
        </Link>
      </main>
      <SiteFooter locale="fr" />
    </div>
  )
}
