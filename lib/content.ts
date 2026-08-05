import { readFile, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import matter from 'gray-matter'
import type { Post, Project } from './content.types'

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

export async function getProjects(): Promise<Project[]> {
  const entries = await readCollection('projects')
  return entries
    .map(({ slug, data, body }) => ({
      slug,
      title: data.title,
      year: String(data.year),
      description: data.description,
      shortDescription: data.shortDescription,
      tech: data.tech ?? [],
      category: data.category,
      cover: data.cover,
      links: data.links ?? {},
      body,
    }))
    .sort((a, b) => b.year.localeCompare(a.year))
}

export async function getProject(slug: string): Promise<Project | null> {
  return (await getProjects()).find((p) => p.slug === slug) ?? null
}
