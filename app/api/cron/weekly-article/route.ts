import { notifyWeeklyDraft } from '@/lib/email'
import { generateWeeklyArticleDraft } from '@/lib/weekly-article'

export const maxDuration = 60

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return json({ ok: false, error: 'Unauthorized' }, 401)
  }

  try {
    const { post, created } = await generateWeeklyArticleDraft()
    const email = await notifyWeeklyDraft(post)
    if (!email.sent) {
      console.error('Weekly article draft notification failed.', {
        slug: post.slug,
        reason: email.reason ?? 'Email provider returned no detail.',
      })
    }
    return json({ ok: true, slug: post.slug, created, emailSent: email.sent })
  } catch (error) {
    console.error('Weekly article draft generation failed.', error)
    return json({ ok: false, error: 'Weekly article draft generation failed.' }, 500)
  }
}
