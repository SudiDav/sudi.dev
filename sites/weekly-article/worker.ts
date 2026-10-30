export type WeeklyEnvironment = {
  SITE: { fetch(request: Request): Promise<Response> }
  CRON_SECRET?: string
}

export async function runWeeklyDraft(env: WeeklyEnvironment): Promise<void> {
  if (!env.CRON_SECRET) throw new Error('CRON_SECRET is not configured.')
  const response = await env.SITE.fetch(new Request('https://sudi.dev/api/cron/weekly-article', {
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  }))
  if (!response.ok) throw new Error(`Weekly draft request failed (${response.status}).`)
}

const worker = {
  scheduled(_event: unknown, env: WeeklyEnvironment, ctx: { waitUntil(task: Promise<void>): void }) {
    ctx.waitUntil(runWeeklyDraft(env))
  },
}

export default worker
