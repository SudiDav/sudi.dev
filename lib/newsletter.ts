import 'server-only'
import { Resend } from 'resend'
import type { Post } from './content.types'
import { SITE_URL } from './site'

const BROADCAST_PREFIX = 'sudi.dev post:'
const UNSUBSCRIBE_TOKEN = '{{{RESEND_UNSUBSCRIBE_URL}}}'

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

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character,
  )
}

function absoluteCover(cover: string) {
  return /^https?:\/\//i.test(cover) ? cover : undefined
}

function postUrl(post: Post) {
  return `${SITE_URL}/blog/${post.slug}`
}

function renderPostEmail(post: Post) {
  const title = escapeHtml(post.title)
  const excerpt = escapeHtml(post.excerpt)
  const category = escapeHtml(post.category)
  const url = postUrl(post)
  const cover = absoluteCover(post.cover)
  const image = cover
    ? `<tr><td style="padding:0 0 28px"><img src="${escapeHtml(cover)}" alt="" width="560" style="display:block;width:100%;height:auto;border:0;border-radius:12px" /></td></tr>`
    : ''

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0B0B11;color:#EDEDF0;font-family:Inter,Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0B0B11">
      <tr><td align="center" style="padding:36px 16px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px">
          <tr><td style="padding:0 20px 20px;color:#607EBC;font-size:15px;font-weight:700;letter-spacing:.08em">SUDI.DEV</td></tr>
          <tr><td style="padding:32px 20px;background:#1A1A24;border:1px solid #2A2A35;border-radius:16px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              ${image}
              <tr><td style="padding-bottom:12px;color:#607EBC;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${category}</td></tr>
              <tr><td style="padding-bottom:14px;color:#EDEDF0;font-size:30px;line-height:1.2;font-weight:700">${title}</td></tr>
              <tr><td style="padding-bottom:26px;color:#8B8B96;font-size:16px;line-height:1.6">${excerpt}</td></tr>
              <tr><td>
                <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;background:#607EBC;border-radius:8px;color:#fff;font-size:14px;font-weight:700;text-decoration:none">Read the post</a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:22px 20px 0;color:#5C5C66;font-size:12px;line-height:1.6">
            You are receiving this because you subscribed to the sudi.dev newsletter.<br />
            <a href="${UNSUBSCRIBE_TOKEN}" style="color:#8B8B96">Unsubscribe</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  const text = [
    'SUDI.DEV',
    '',
    post.category.toUpperCase(),
    post.title,
    post.excerpt,
    '',
    `Read the post: ${url}`,
    '',
    `Unsubscribe: ${UNSUBSCRIBE_TOKEN}`,
  ].join('\n')

  return { html, text }
}

export async function createPostBroadcast(post: Post, commitSha: string): Promise<NewsletterOutcome> {
  const key = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID
  const from = process.env.EMAIL_FROM
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' }
  if (!audienceId) return { ok: false, error: 'RESEND_AUDIENCE_ID not set' }
  if (!from) return { ok: false, error: 'EMAIL_FROM not set' }

  const name = `${BROADCAST_PREFIX} ${post.slug} · ${commitSha}`
  const { html, text } = renderPostEmail(post)

  try {
    const { data, error } = await new Resend(key).broadcasts.create(
      {
        audienceId,
        from,
        name,
        subject: `New on sudi.dev: ${post.title}`,
        previewText: post.excerpt,
        html,
        text,
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

    const { data, error } = await resend.broadcasts.send(id)
    if (error) return { ok: false, error: error.message }
    if (!data?.id) return { ok: false, error: 'Resend sent the broadcast without an id' }
    return { ok: true, id: data.id }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'newsletter send failed') }
  }
}
