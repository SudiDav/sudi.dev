'use client'

import Image from 'next/image'
import { useId, useRef, useState } from 'react'
import { ExternalLink, LoaderCircle, Mail, Send, TriangleAlert } from 'lucide-react'
import { sendNewsletter } from '@/app/admin/actions'
import type { NewsletterBroadcastSummary } from '@/lib/newsletter'
import './newsletter-send-dialog.css'

const STATUS_STYLES = {
  draft: 'bg-[#F59E0B15] text-admin-warning',
  queued: 'bg-[#607EBC20] text-accent',
  sent: 'bg-[#10B98115] text-admin-success',
} as const

export function NewsletterList({ broadcasts }: { broadcasts: NewsletterBroadcastSummary[] }) {
  const [items, setItems] = useState(broadcasts)
  const [selected, setSelected] = useState<NewsletterBroadcastSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const originRow = useRef<HTMLElement | null>(null)
  const inFlight = useRef(false)
  const titleId = useId()
  const descriptionId = useId()

  function openConfirmation(broadcast: NewsletterBroadcastSummary, trigger: HTMLButtonElement) {
    setSelected(broadcast)
    setError(null)
    setNotice('')
    originRow.current = trigger.closest('article')
    dialog.current?.showModal()
    cancelButton.current?.focus()
  }

  async function confirmSend() {
    if (!selected || inFlight.current) return
    inFlight.current = true
    setSending(true)
    setError(null)
    try {
      const result = await sendNewsletter(selected.id)
      if (result.ok) {
        setItems((current) =>
          current.map((item) => (item.id === selected.id ? { ...item, status: 'queued' } : item)),
        )
        setNotice('Newsletter queued for delivery.')
        dialog.current?.close()
        originRow.current?.focus({ preventScroll: true })
      } else {
        setError(result.error)
      }
    } catch {
      setError('Could not confirm delivery. Check this broadcast in Resend before trying again.')
    } finally {
      inFlight.current = false
      setSending(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-admin-border bg-admin-card p-10 text-center">
        <Mail size={22} className="mx-auto text-admin-text-tertiary" />
        <p className="mt-3 text-sm text-admin-text-secondary">No newsletter drafts yet.</p>
        <p className="mt-1 text-xs text-admin-text-tertiary">
          Publish a post to prepare a branded draft here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="sr-only">{notice}</p>
      {items.map((broadcast) => (
        <article
          key={broadcast.id}
          tabIndex={-1}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-admin-border bg-admin-card p-5"
        >
          <div className="flex min-w-0 items-start gap-3">
            <Mail size={18} className="mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0">
              <h2 className="truncate text-[14px] font-medium text-admin-text">{broadcast.name}</h2>
              <p className="mt-1 text-xs text-admin-text-tertiary">
                Created {broadcast.createdAt.slice(0, 10)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase ${STATUS_STYLES[broadcast.status]}`}
            >
              {broadcast.status}
            </span>
            <a
              href={`https://resend.com/broadcasts/${encodeURIComponent(broadcast.id)}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${broadcast.name} in Resend`}
              className="text-admin-text-tertiary hover:text-admin-text"
            >
              <ExternalLink size={15} />
            </a>
            {broadcast.status === 'draft' ? (
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`Send ${broadcast.name}`}
                onClick={(event) => openConfirmation(broadcast, event.currentTarget)}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Send size={13} aria-hidden="true" />
                Send
              </button>
            ) : null}
          </div>
        </article>
      ))}

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          if (inFlight.current) event.preventDefault()
        }}
        className="newsletter-send-dialog m-auto rounded-[1.25rem] border border-admin-border bg-admin-card p-0 text-admin-text"
      >
        <div className="px-5 pt-6 pb-5 sm:px-7 sm:pt-7 sm:pb-6">
          <Image src="/icon.png" alt="" width={48} height={48} unoptimized className="mb-5 rounded-xl" />
          <h2 id={titleId} className="font-display text-[1.65rem] leading-tight font-semibold tracking-tight">Send newsletter?</h2>
          <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-admin-text-secondary">
            This will email all subscribed contacts in this broadcast’s audience.
          </p>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-admin-border bg-admin-subtle px-4 py-3.5">
            <Mail size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-xs text-admin-text-secondary">Broadcast</p>
              <p className="mt-0.5 text-sm leading-snug font-medium [overflow-wrap:anywhere]">{selected?.name}</p>
            </div>
          </div>

          {error ? (
            <div role="alert" className="mt-4 flex items-start gap-2 text-sm text-admin-text">
              <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-admin-danger" />
              {error}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-[1fr_1.4fr] gap-2 border-t border-admin-border px-5 py-4 sm:flex sm:justify-end sm:px-7">
          <span role="status" className="sr-only">{sending ? 'Sending newsletter' : ''}</span>
          <button
            ref={cancelButton}
            type="button"
            disabled={sending}
            onClick={() => dialog.current?.close()}
            className="min-h-11 rounded-lg border border-admin-border bg-admin-card px-4 text-sm font-medium hover:bg-admin-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
          >Cancel</button>
          <button
            type="button"
            disabled={sending}
            onClick={confirmSend}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4565A4] px-3 text-sm font-semibold text-white hover:bg-[#37558F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-70 sm:px-4"
          >
            {sending ? <LoaderCircle size={15} aria-hidden="true" className="motion-safe:animate-spin" /> : <Send size={15} aria-hidden="true" />}
            {sending ? 'Sending…' : 'Send newsletter'}
          </button>
        </div>
      </dialog>
    </div>
  )
}
