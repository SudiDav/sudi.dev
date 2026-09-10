import { getPosts, getProjects } from './content'
import { formatPostDate } from './format'
import type { AdminPost, AdminProject, AdminProjectStatus } from './admin-fixtures'
import { getAdminCommentCount } from './admin-comments'
import { formatViewCount, getPostViewCounts } from './vercel-analytics'

/**
 * Adapts the real MDX content into the shapes the admin screens render.
 *
 * The admin now reflects what is actually on the site rather than the design's
 * sample data. Comments remain "—" because the post table does not load a
 * per-article count. View counts come from Vercel Web Analytics and remain
 * "—" when that protected API is not configured. The dashboard count comes
 * from the same Neon store as the moderation queue.
 */
function toAdminPosts(posts: Awaited<ReturnType<typeof getPosts>>, views: Record<string, number>): AdminPost[] {
  return posts.map((post) => ({
    id: post.slug,
    title: post.title,
    category: post.category,
    status: post.status ?? 'Published',
    date: formatPostDate(post.date),
    views: views[post.slug] === undefined ? '—' : formatViewCount(views[post.slug]),
    comments: '—',
  }))
}

export async function getAdminPosts(): Promise<AdminPost[]> {
  const posts = await getPosts()
  const viewResult = await getPostViewCounts(posts.map((post) => post.slug))
  return toAdminPosts(posts, viewResult.counts)
}

export async function getAdminPostCounts(posts?: AdminPost[]) {
  const allPosts = posts ?? (await getAdminPosts())
  const count = (status: string) => String(allPosts.filter((p) => p.status === status).length)
  return [
    { label: 'All Posts', value: String(allPosts.length) },
    { label: 'Published', value: count('Published') },
    { label: 'Drafts', value: count('Draft') },
    { label: 'Archived', value: count('Archived') },
  ]
}

/**
 * The design's project statuses (Featured / Active / Archived / WIP) are richer
 * than the content model, which only knows whether a project is featured on the
 * homepage. Everything else reads as Active.
 */
export async function getAdminProjects(): Promise<AdminProject[]> {
  const projects = await getProjects()
  return projects.map((project) => ({
    slug: project.slug,
    name: project.title,
    description: project.description,
    tech: project.tech.join(', '),
    views: '—',
    status: (project.shortDescription ? 'Featured' : 'Active') as AdminProjectStatus,
  }))
}

export async function getAdminStats() {
  const [posts, projects, commentResult] = await Promise.all([
    getPosts(),
    getProjects(),
    getAdminCommentCount(),
  ])
  const viewResult = await getPostViewCounts(posts.map((post) => post.slug))
  const published = posts.filter((post) => (post.status ?? 'Published') === 'Published')
  const hasAllPublishedCounts = viewResult.available && published.every((post) => viewResult.counts[post.slug] !== undefined)
  const totalViews = hasAllPublishedCounts
    ? formatViewCount(published.reduce((total, post) => total + viewResult.counts[post.slug], 0))
    : '—'
  const adminPosts = toAdminPosts(posts, viewResult.counts)
  return {
    views: totalViews,
    viewsPeriod: hasAllPublishedCounts ? 'all published posts' : 'analytics unavailable',
    posts: String(adminPosts.filter((p) => p.status === 'Published').length),
    drafts: adminPosts.filter((p) => p.status === 'Draft').map((p) => p.title),
    projects: String(projects.length),
    comments: commentResult.error ? '—' : String(commentResult.count),
    commentsPeriod: commentResult.error ? 'comments unavailable' : 'all stored comments',
  }
}
