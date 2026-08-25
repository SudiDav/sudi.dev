import type { Post, Project } from './content.types'

/** Design: Work Page → "Filters". `All` is the no-filter option. */
// The design's categories (CLI Tools, Libraries) describe a tooling portfolio.
// These describe the actual work: fintech, operational platforms, side projects.
export const PROJECT_FILTERS = ['All', 'Fintech', 'Platforms', 'Side Projects'] as const

/**
 * Design: Blog Page → "Category Filters".
 *
 * Renamed to match what the posts are actually about — .NET tutorials, an
 * observability piece, two on how the work gets done, and one that is not about
 * software at all. The design's "Architecture" and "Open Source" pills had
 * nothing behind them.
 */
export const POST_FILTERS = ['All', '.NET', 'DevOps', 'Craft', 'Life'] as const

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

/**
 * Build the article list for the blog page without hiding a featured post
 * when the reader selects its category. The featured post is only reserved
 * for the pinned slot on the unfiltered, empty-search view.
 */
export function listBlogPosts(posts: Post[], category: string, query: string): Post[] {
  const candidates = category === 'All' && !query.trim() ? posts.filter((post) => !post.featured) : posts
  return searchPosts(filterPostsByCategory(candidates, category), query)
}

/**
 * The same lists without "All", for the admin's category dropdowns.
 *
 * Derived rather than repeated: when these were two separate literals the
 * editor went on offering "Web Apps" and "Development" long after the site had
 * stopped filtering on them, so a saved project could land in a category no
 * page would ever show.
 */
export const PROJECT_CATEGORIES = PROJECT_FILTERS.filter((c) => c !== 'All')
export const POST_CATEGORIES = POST_FILTERS.filter((c) => c !== 'All')
