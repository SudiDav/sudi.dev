import { describe, it, expect } from 'vitest'
import { filterProjects, filterPostsByCategory, searchPosts } from './filters'
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
