export type Post = {
  slug: string
  title: string
  excerpt: string
  date: string // ISO 8601, e.g. "2026-07-15"
  readingTime: string // as displayed, e.g. "12 min read"
  category: string // as displayed, e.g. "DEVELOPMENT"
  cover: string // path under /public
  featured: boolean
  body: string // raw MDX
}

export type Project = {
  slug: string
  title: string
  year: string
  description: string
  tech: string[]
  category: string // "Web Apps" | "CLI Tools" | "Libraries" | "Open Source"
  cover: string
  links: { github?: string; live?: string }
  body: string
}
