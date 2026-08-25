import { describe, it, expect } from 'vitest'
import {
  filterProjects,
  filterPostsByCategory,
  listBlogPosts,
  searchPosts,
  PROJECT_CATEGORIES,
  POST_CATEGORIES,
  PROJECT_FILTERS,
  POST_FILTERS,
} from './filters'
import type { Post, Project } from './content.types'

const project = (slug: string, category: string) => ({ slug, category }) as Project

const projects = [
  project('chequepoint', 'Fintech'),
  project('altech-paygo', 'Platforms'),
  project('auction-car', 'Side Projects'),
]

describe('filterProjects', () => {
  it('returns everything for All', () => {
    expect(filterProjects(projects, 'All')).toHaveLength(3)
  })

  it('filters to a single category', () => {
    expect(filterProjects(projects, 'Platforms').map((p) => p.slug)).toEqual(['altech-paygo'])
  })

  it('returns nothing for a category no project uses', () => {
    expect(filterProjects(projects, 'Open Source')).toHaveLength(0)
  })
})

const post = (slug: string, title: string, excerpt: string, category: string) =>
  ({ slug, title, excerpt, category }) as Post

const posts = [
  post('trpc', 'Why I Switched from REST to tRPC', 'Type-safe APIs end-to-end', 'Development'),
  post('events', 'Event Sourcing in Practice', 'Lessons learned in fintech', 'Architecture'),
]

const blogPosts = [
  { ...post('now', 'Maybe Love Is the Now', 'A reflection on presence', 'Life'), featured: true },
  { ...post('observability', 'Observability 101', 'A practical guide', 'DevOps'), featured: false },
]

describe('filterPostsByCategory', () => {
  it('returns everything for All', () => {
    expect(filterPostsByCategory(posts, 'All')).toHaveLength(2)
  })

  it('matches the Title Case values the filter pills use', () => {
    expect(filterPostsByCategory(posts, 'Architecture').map((p) => p.slug)).toEqual(['events'])
  })

  it('does not match on differing case, which is why content stores Title Case', () => {
    expect(filterPostsByCategory(posts, 'ARCHITECTURE')).toHaveLength(0)
  })
})

describe('listBlogPosts', () => {
  it('includes the featured post when a category is selected', () => {
    expect(listBlogPosts(blogPosts, 'Life', '')).toEqual([blogPosts[0]])
  })

  it('keeps the featured post out of the unfiltered pinned list', () => {
    expect(listBlogPosts(blogPosts, 'All', '')).toEqual([blogPosts[1]])
  })
})

describe('searchPosts', () => {
  it('returns everything for an empty query', () => {
    expect(searchPosts(posts, '')).toHaveLength(2)
  })

  it('matches the title case-insensitively', () => {
    expect(searchPosts(posts, 'trpc').map((p) => p.slug)).toEqual(['trpc'])
  })

  it('matches the excerpt', () => {
    expect(searchPosts(posts, 'fintech').map((p) => p.slug)).toEqual(['events'])
  })

  it('ignores surrounding whitespace', () => {
    expect(searchPosts(posts, '  trpc  ').map((p) => p.slug)).toEqual(['trpc'])
  })
})

describe('admin category lists', () => {
  // These feed the admin's dropdowns. When they were separate literals the
  // editor offered "Web Apps" and "Development" long after the site had stopped
  // filtering on them, so a saved item landed in a category no page displayed.
  it('offer exactly the filters, minus All', () => {
    expect(PROJECT_CATEGORIES).toEqual(PROJECT_FILTERS.filter((c) => c !== 'All'))
    expect(POST_CATEGORIES).toEqual(POST_FILTERS.filter((c) => c !== 'All'))
  })

  it('never offer All as something to save', () => {
    expect(PROJECT_CATEGORIES).not.toContain('All')
    expect(POST_CATEGORIES).not.toContain('All')
  })
})
