import { Resend } from 'resend'

/**
 * Outbound email.
 *
 * Every function here is a no-op when RESEND_API_KEY is unset, so the site runs
 * unchanged locally and in any environment where email is not configured. That
 * matters most for the newsletter: a notification failing must never cost a
 * subscriber, since the address is already saved by the time we get here.
 */
const FROM = process.env.EMAIL_FROM ?? 'sudi.dev <onboarding@resend.dev>'

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

type SendResult = { sent: boolean; reason?: string }

async function send(subject: string, text: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_EMAIL ?? process.env.ADMIN_EMAIL
  if (!key) return { sent: false, reason: 'RESEND_API_KEY not set' }
  if (!to) return { sent: false, reason: 'CONTACT_EMAIL not set' }

  try {
    const { error } = await new Resend(key).emails.send({ from: FROM, to, subject, text })
    return error ? { sent: false, reason: error.message } : { sent: true }
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : 'send failed' }
  }
}

/** Tells you someone signed up. */
export function notifyNewSubscriber(address: string) {
  return send(
    `New subscriber: ${address}`,
    [
      `${address} just subscribed to the sudi.dev newsletter.`,
      '',
      'The list lives in your Resend audience — not in the repo, so that',
      'subscriber addresses are never published alongside the source.',
    ].join('\n'),
  )
}

/**
 * Add the address to the Resend audience.
 *
 * This replaces writing subscribers into the repository. The repo is public so
 * that GitHub Discussions can back the comments, which makes it the wrong place
 * for anyone's email address.
 *
 * Like sending, this is a no-op when unconfigured — reported, never thrown.
 */
export async function addToAudience(address: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID
  if (!key) return { sent: false, reason: 'RESEND_API_KEY not set' }
  if (!audienceId) return { sent: false, reason: 'RESEND_AUDIENCE_ID not set' }

  try {
    const { error } = await new Resend(key).contacts.create({
      email: address,
      audienceId,
      unsubscribed: false,
    })
    return error ? { sent: false, reason: error.message } : { sent: true }
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : 'contact create failed' }
  }
}
