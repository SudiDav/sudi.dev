import { getPosts, getProjects } from './content'
import { formatPostDate } from './format'
import type { AdminPost, AdminProject, AdminProjectStatus } from './admin-fixtures'
import { getAdminCommentCount } from './admin-comments'

/**
 * Adapts the real MDX content into the shapes the admin screens render.
 *
 * The admin now reflects what is actually on the site rather than the design's
 * sample data. Per-post view and comment counts remain "—" because the post
 * table does not load analytics or discussion replies. The dashboard and the
 * Comments page read the public GitHub Discussions that power the site's
 * giscus embed.
 */
export async function getAdminPosts(): Promise<AdminPost[]> {
  const posts = await getPosts()
  return posts.map((post) => ({
    id: post.slug,
    title: post.title,
    category: post.category,
    status: post.status ?? 'Published',
    date: formatPostDate(post.date),
    views: '—',
    comments: '—',
  }))
}

export async function getAdminPostCounts() {
  const posts = await getAdminPosts()
  const count = (status: string) => String(posts.filter((p) => p.status === status).length)
  return [
    { label: 'All Posts', value: String(posts.length) },
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
    getAdminPosts(),
    getProjects(),
    getAdminCommentCount(),
  ])
  return {
    posts: String(posts.filter((p) => p.status === 'Published').length),
    drafts: posts.filter((p) => p.status === 'Draft').map((p) => p.title),
    projects: String(projects.length),
    comments: commentResult.error ? '—' : String(commentResult.count),
    commentsPeriod: commentResult.error ? 'comments unavailable' : 'GitHub Discussions',
  }
}
