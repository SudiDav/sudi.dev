'use client'

import { useState, useTransition } from 'react'
import { Mail, Check } from 'lucide-react'
import { subscribe } from '@/app/admin/actions'
import type { SiteLocale } from '@/lib/locale'

/**
 * Design: Blog Sidebar → "Newsletter" — padding 24, gap 16, radius 8.
 *
 * Addresses are stored in the configured Resend audience, never in the public
 * repository. A provider notification is helpful but not required for signup.
 */
export function NewsletterForm({ locale = 'en' }: { locale?: SiteLocale } = {}) {
  const french = locale === 'fr'
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await subscribe(email)
      if (result.ok) {
        setDone(true)
        setWarning(result.warning ?? null)
        setEmail('')
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-bg-card p-6">
      <Mail size={20} className="text-accent" />
          <h2 className="font-display text-base font-bold text-text-primary">
            {french ? 'Restez informé' : 'Stay Updated'}
          </h2>
      <p className="text-[13px] leading-[1.5] text-text-secondary">
        {french
          ? 'Recevez un message à la publication de nouveaux articles. Pas de spam ; désabonnez-vous à tout moment.'
          : 'Get notified when I publish new articles. No spam, unsubscribe anytime.'}
      </p>

      {done ? (
        <div className="flex flex-col gap-2 text-[13px]">
          <p className="flex items-center gap-2 text-accent">
            <Check size={14} />
            {french ? 'Votre inscription est confirmée.' : "You're on the list."}
          </p>
          {warning ? (
            <p className="text-xs text-text-secondary">
              {french
                ? 'Votre inscription est enregistrée, mais la notification à l’auteur n’a pas pu être envoyée.'
                : warning}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <input
            type="email"
            aria-label={french ? 'Adresse e-mail' : 'Email address'}
            placeholder={french ? 'vous@exemple.com' : 'your@email.com'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
            className="rounded-full border border-border bg-bg-primary px-3.5 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-border-hover focus:outline-none"
          />
          {error ? (
            <p className="text-xs text-[#EF4444]">
              {french
                ? error.includes('valid email')
                  ? 'Veuillez saisir une adresse e-mail valide.'
                  : error.includes('Too many signup attempts')
                    ? 'Trop de tentatives d’inscription. Veuillez réessayer plus tard.'
                    : 'Nous n’avons pas pu enregistrer votre inscription. Veuillez réessayer.'
                : error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-full bg-accent py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? (french ? 'Inscription…' : 'Subscribing…') : (french ? 'S’inscrire' : 'Subscribe')}
          </button>
        </>
      )}
    </div>
  )
}
