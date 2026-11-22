import { TerminalIntro } from './terminal-intro'
import type { SiteLocale } from '@/lib/locale'
import './philosophical-identity.css'

export function PhilosophicalIdentity({ name, locale = 'en' }: { name: string; locale?: SiteLocale }) {
  return (
    <div className="philosophical-identity">
      <TerminalIntro name={name} locale={locale} />
    </div>
  )
}
