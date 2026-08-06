'use client'

import { useState, useTransition } from 'react'
import { Mail, Check } from 'lucide-react'
import { subscribe } from '@/app/admin/actions'

/**
 * Design: Blog Sidebar → "Newsletter" — padding 24, gap 16, radius 8.
 *
 * Addresses are stored in content/subscribers.json. Actually sending anything
 * needs an email provider; keeping the list means no sign-ups are lost before
 * one is wired up.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await subscribe(email)
      if (result.ok) {
        setDone(true)
        setEmail('')
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-bg-card p-6">
      <Mail size={20} className="text-accent" />
      <h2 className="font-display text-base font-bold text-text-primary">Stay Updated</h2>
      <p className="text-[13px] leading-[1.5] text-text-secondary">
        Get notified when I publish new articles. No spam, unsubscribe anytime.
      </p>

      {done ? (
        <p className="flex items-center gap-2 text-[13px] text-accent">
          <Check size={14} />
          You&apos;re on the list.
        </p>
      ) : (
        <>
          <input
            type="email"
            aria-label="Email address"
            placeholder="your@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
            className="rounded-md border border-border bg-bg-primary px-3.5 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-border-hover focus:outline-none"
          />
          {error ? <p className="text-xs text-[#EF4444]">{error}</p> : null}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-md bg-accent py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Subscribing…' : 'Subscribe'}
          </button>
        </>
      )}
    </div>
  )
}
