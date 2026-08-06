import { getPosts, getProjects } from './content'
import { formatPostDate } from './format'
import type { AdminPost, AdminProject, AdminProjectStatus } from './admin-fixtures'

/**
 * Adapts the real MDX content into the shapes the admin screens render.
 *
 * The admin now reflects what is actually on the site rather than the design's
 * sample data. Two figures the design shows have no source in a static site and
 * are rendered as "—" rather than invented: per-post view counts and comment
 * counts, both of which need analytics and a comment store this site does not
 * have yet.
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
  const [posts, projects] = await Promise.all([getAdminPosts(), getProjects()])
  return {
    posts: String(posts.filter((p) => p.status === 'Published').length),
    drafts: posts.filter((p) => p.status === 'Draft').map((p) => p.title),
    projects: String(projects.length),
  }
}
