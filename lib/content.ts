import { readFile, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import matter from 'gray-matter'
import type { Post, Project } from './content.types'
import type { SiteLocale } from './locale'

const CONTENT = join(process.cwd(), 'content')

async function readCollection(dir: string) {
  const files = await readdir(join(CONTENT, dir))
  return Promise.all(
    files
      .filter((f) => f.endsWith('.mdx'))
      .map(async (file) => {
        const raw = await readFile(join(CONTENT, dir, file), 'utf8')
        const { data, content } = matter(raw)
        return { slug: basename(file, '.mdx'), data, body: content }
      }),
  )
}

export async function getPosts(): Promise<Post[]> {
  const entries = await readCollection('posts')
  return entries
    .map(({ slug, data, body }) => ({
      slug,
      title: data.title,
      excerpt: data.excerpt,
      date: data.date,
      readingTime: data.readingTime,
      category: data.category,
      cover: data.cover,
      featured: Boolean(data.featured),
      featuredAt: typeof data.featuredAt === 'string' ? data.featuredAt : undefined,
      status: data.status,
      generatedWeek: data.generatedWeek,
      subtitle: data.subtitle,
      breadcrumb: data.breadcrumb,
      tags: data.tags,
      home: data.home,
      body,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function getPost(slug: string): Promise<Post | null> {
  return (await getPosts()).find((p) => p.slug === slug) ?? null
}

async function readTranslations(collection: 'posts' | 'projects') {
  try {
    const entries = await readCollection('fr/' + collection)
    return new Map(entries.map((entry) => [entry.slug, entry]))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Map()
    throw error
  }
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export async function getPublishedPosts(locale: SiteLocale = 'en'): Promise<Post[]> {
  const posts = (await getPosts()).filter((post) => post.status === undefined || post.status === 'Published')
  if (locale === 'en') return posts

  const translations = await readTranslations('posts')
  return posts.flatMap((post) => {
    const translation = translations.get(post.slug)
    if (!translation) return []
    const { data, body } = translation
    if (![data.title, data.excerpt, data.readingTime, body].every(hasText)) return []
    return [{
      ...post, body,
      title: data.title,
      excerpt: data.excerpt,
      readingTime: data.readingTime,
      subtitle: data.subtitle,
      breadcrumb: data.breadcrumb,
      home: data.home,
    }]
  })
}

export async function getPublishedPost(slug: string, locale: SiteLocale = 'en'): Promise<Post | null> {
  return (await getPublishedPosts(locale)).find((post) => post.slug === slug) ?? null
}

export async function getProjects(locale: SiteLocale = 'en'): Promise<Project[]> {
  const entries = await readCollection('projects')
  const projects = entries
    .map(({ slug, data, body }) => ({
      slug,
      title: data.title,
      year: String(data.year),
      description: data.description,
      shortDescription: data.shortDescription,
      tech: data.tech ?? [],
      category: data.category,
      cover: data.cover ?? '',
      coverPresentation: data.coverPresentation,
      logo: data.logo,
      links: data.links ?? {},
      body,
    }))
    .sort((a, b) => b.year.localeCompare(a.year))

  if (locale === 'en') return projects
  const translations = await readTranslations('projects')
  return projects.flatMap((project) => {
    const entry = translations.get(project.slug)
    if (!entry || !hasText(entry.data.title) || !hasText(entry.data.description)) return []
    return [{
      ...project,
      body: entry.body,
      title: entry.data.title,
      description: entry.data.description,
      shortDescription: entry.data.shortDescription,
    }]
  })
}

export async function getProject(slug: string): Promise<Project | null> {
  return (await getProjects()).find((p) => p.slug === slug) ?? null
}
