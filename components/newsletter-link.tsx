'use client'

import { useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X } from 'lucide-react'
import { NewsletterForm } from '@/components/newsletter-form'
import { localePath, type SiteLocale } from '@/lib/locale'

// True in the browser, false during server rendering, so the portal only
// targets document.body once it exists.
const subscribe = () => () => {}
const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

/**
 * An article link written as `[text](#newsletter)` opens the signup form in a
 * modal instead of navigating. Without JavaScript it falls back to /blog, whose
 * sidebar carries the same form.
 *
 * The dialog is portalled to <body> because the link sits inside a paragraph,
 * and a <dialog> there would be invalid HTML.
 */
export function NewsletterLink({ children, locale = 'en' }: { children?: React.ReactNode; locale?: SiteLocale }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isClient = useIsClient()

  const close = () => dialogRef.current?.close()

  return (
    <>
      <Link
        href={localePath(locale, '/blog')}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault()
          dialogRef.current?.showModal()
        }}
        className="text-accent underline underline-offset-2"
      >
        {children}
      </Link>
      {isClient
        ? createPortal(
            <dialog
              ref={dialogRef}
              aria-label={locale === 'fr' ? 'S’inscrire à la newsletter' : 'Subscribe to the newsletter'}
              onClick={(event) => {
                if (event.target === event.currentTarget) close()
              }}
              className="m-auto w-[min(24rem,calc(100vw-2rem))] border-0 bg-transparent p-0 backdrop:bg-black/65"
            >
              <div className="relative">
                <button
                  type="button"
                  aria-label={locale === 'fr' ? 'Fermer' : 'Close'}
                  onClick={close}
                  className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-text-tertiary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <X size={18} />
                </button>
                <NewsletterForm locale={locale} />
              </div>
            </dialog>,
            document.body,
          )
        : null}
    </>
  )
}
