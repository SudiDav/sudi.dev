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
