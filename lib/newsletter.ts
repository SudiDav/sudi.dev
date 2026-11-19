import 'server-only'
import { Resend } from 'resend'
import type { Post } from './content.types'
import { renderPostEmail } from './newsletter-email'

const BROADCAST_PREFIX = 'sudi.dev post:'
const BROADCAST_NAME_LIMIT = 70
const NEWSLETTER_FROM = 'Sudi David <hello@sudi.dev>'

export type NewsletterBroadcastSummary = {
  id: string
  name: string
  status: 'draft' | 'queued' | 'sent'
  createdAt: string
}

export type NewsletterOutcome =
  | { ok: true; id: string; name: string; created: boolean }
  | { ok: false; error: string }

export type NewsletterListOutcome =
  | { ok: true; broadcasts: NewsletterBroadcastSummary[] }
  | { ok: false; error: string }

export type NewsletterSendOutcome = { ok: true; id: string } | { ok: false; error: string }

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function broadcastName(slug: string, commitSha: string) {
  const prefix = `${BROADCAST_PREFIX} `
  const suffix = ` · ${commitSha}`
  const name = `${prefix}${slug}${suffix}`
  if (name.length <= BROADCAST_NAME_LIMIT) return name

  const shortSuffix = ` · ${commitSha.slice(0, 12)}`
  const slugLimit = BROADCAST_NAME_LIMIT - prefix.length - shortSuffix.length
  return `${prefix}${slug.slice(0, slugLimit).replace(/-+$/, '')}${shortSuffix}`
}

export async function createPostBroadcast(post: Post, commitSha: string): Promise<NewsletterOutcome> {
  const key = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' }
  if (!audienceId) return { ok: false, error: 'RESEND_AUDIENCE_ID not set' }

  const name = broadcastName(post.slug, commitSha)

  try {
    const { data, error } = await new Resend(key).broadcasts.create(
      {
        audienceId,
        from: NEWSLETTER_FROM,
        name,
        ...renderPostEmail(post),
        send: false,
      },
      { headers: { 'Idempotency-Key': `sudi-post-newsletter-${commitSha}` } },
    )
    if (error) return { ok: false, error: error.message }
    if (!data?.id) return { ok: false, error: 'Resend created a draft without an id' }
    return { ok: true, id: data.id, name, created: true }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'newsletter draft failed') }
  }
}

export async function listNewsletterBroadcasts(): Promise<NewsletterListOutcome> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' }

  try {
    const { data, error } = await new Resend(key).broadcasts.list({ limit: 100 })
    if (error) return { ok: false, error: error.message }
    return {
      ok: true,
      broadcasts: (data?.data ?? [])
        .filter((broadcast) => broadcast.name.startsWith(BROADCAST_PREFIX))
        .map((broadcast) => ({
          id: broadcast.id,
          name: broadcast.name,
          status: broadcast.status,
          createdAt: broadcast.created_at,
        })),
    }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'newsletter list failed') }
  }
}

export async function sendNewsletterBroadcast(id: string): Promise<NewsletterSendOutcome> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' }

  try {
    const resend = new Resend(key)
    const current = await resend.broadcasts.get(id)
    if (current.error) return { ok: false, error: current.error.message }
    if (!current.data) return { ok: false, error: 'Resend returned no broadcast' }
    if (current.data.status !== 'draft') {
      return { ok: false, error: 'This newsletter has already been sent.' }
    }
    if (!current.data.name.startsWith(BROADCAST_PREFIX)) {
      return { ok: false, error: 'This newsletter does not belong to sudi.dev.' }
    }

    const { data, error } = await resend.broadcasts.send(id)
    if (error) return { ok: false, error: error.message }
    if (!data?.id) return { ok: false, error: 'Resend sent the broadcast without an id' }
    return { ok: true, id: data.id }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'newsletter send failed') }
  }
}
