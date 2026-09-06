import 'server-only'

export type PostViewResult = {
  counts: Record<string, number>
  available: boolean
  error?: string
}

type VisitsCountResponse = {
  data?: { pageviews?: number }
}

function analyticsQuery(path: string) {
  const params = new URLSearchParams({
    projectId: process.env.VERCEL_PROJECT_ID ?? '',
    filter: `requestPath eq '${path}'`,
  })
  const teamId = process.env.VERCEL_TEAM_ID
  const teamSlug = process.env.VERCEL_TEAM_SLUG
  if (teamId) params.set('teamId', teamId)
  else if (teamSlug) params.set('slug', teamSlug)
  return `https://api.vercel.com/v1/query/web-analytics/visits/count?${params.toString()}`
}

/** Query lifetime production page views for the exact public path of each post. */
export async function getPostViewCounts(slugs: string[]): Promise<PostViewResult> {
  const token = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) {
    return { counts: {}, available: false, error: 'Vercel Web Analytics is not configured.' }
  }

  const uniqueSlugs = [...new Set(slugs)].filter((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
  const counts: Record<string, number> = {}
  let failed = false

  await Promise.all(
    uniqueSlugs.map(async (slug) => {
      try {
        const response = await fetch(analyticsQuery(`/blog/${slug}`), {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          cache: 'no-store',
        })
        if (!response.ok) {
          failed = true
          return
        }
        const body = (await response.json()) as VisitsCountResponse
        const pageviews = body.data?.pageviews
        if (typeof pageviews !== 'number' || !Number.isFinite(pageviews) || pageviews < 0) {
          failed = true
          return
        }
        counts[slug] = Math.floor(pageviews)
      } catch {
        failed = true
      }
    }),
  )

  return {
    counts,
    available: true,
    ...(failed ? { error: 'Some Vercel Web Analytics counts could not be loaded.' } : {}),
  }
}

export function formatViewCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}
