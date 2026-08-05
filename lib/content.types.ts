export type Post = {
  slug: string
  title: string
  excerpt: string
  date: string // ISO 8601, e.g. "2026-07-15"
  readingTime: string // as displayed, e.g. "12 min read"
  // Title Case, matching the Blog page's filter pills:
  // "Development" | "DevOps" | "Architecture" | "Open Source".
  // The FeaturedBlogCard badge uppercases this in CSS — do not store it uppercased,
  // or category filtering silently matches nothing.
  category: string
  cover: string // path under /public
  featured: boolean
  // Editorial state, surfaced in the admin. Absent means Published, so existing
  // content needs no migration.
  status?: 'Published' | 'Draft' | 'Archived'
  // Article-page only. The design's Article Subtitle differs slightly from the
  // excerpt the blog cards show, and its breadcrumb shows a short slug.
  subtitle?: string
  breadcrumb?: string
  tags?: string[]
  // The homepage's "Latest Articles" instances carry shorter copy than the blog
  // list, and the featured post additionally shows a shorter title and a
  // different reading time there. These are the design's own per-surface
  // overrides, so they are modelled rather than reconciled away.
  home?: { title?: string; excerpt?: string; readingTime?: string }
  body: string // raw MDX
}

export type Project = {
  slug: string
  title: string
  year: string
  description: string
  // The homepage's Project Card instances carry a shorter blurb than the Work
  // page's cards — the design's own override, not a truncation. Optional: only
  // the three projects the homepage features need one.
  shortDescription?: string
  tech: string[]
  category: string // "Web Apps" | "CLI Tools" | "Libraries" | "Open Source"
  cover: string
  links: { github?: string; live?: string }
  body: string
}
