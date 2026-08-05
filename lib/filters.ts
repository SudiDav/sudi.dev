import type { Post, Project } from './content.types'

/** Design: Work Page → "Filters". `All` is the no-filter option. */
export const PROJECT_FILTERS = ['All', 'Web Apps', 'CLI Tools', 'Libraries', 'Open Source'] as const

/** Design: Blog Page → "Category Filters". */
export const POST_FILTERS = ['All', 'Development', 'DevOps', 'Architecture', 'Open Source'] as const

export function filterProjects(projects: Project[], category: string): Project[] {
  if (category === 'All') return projects
  return projects.filter((project) => project.category === category)
}

export function filterPostsByCategory(posts: Post[], category: string): Post[] {
  if (category === 'All') return posts
  return posts.filter((post) => post.category === category)
}

export function searchPosts(posts: Post[], query: string): Post[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return posts
  return posts.filter(
    (post) =>
      post.title.toLowerCase().includes(needle) || post.excerpt.toLowerCase().includes(needle),
  )
}
