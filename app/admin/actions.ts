'use server'

import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/auth'
import {
  savePost,
  createProject,
  saveProject,
  saveSettings,
  slugify,
  type PostDraft,
} from '@/lib/publish'
import type { SiteSettings } from '@/lib/site'

/**
 * Every action re-checks authorisation itself.
 *
 * Server actions are reachable as POST endpoints by anyone who knows the action
 * id — they are NOT protected by the proxy or by the layout that rendered the
 * form. The check has to live here.
 */
async function requireAdmin() {
  if (!(await isAdmin())) throw new Error('Not authorised')
}

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function updatePost(slug: string, changes: PostDraft): Promise<ActionResult> {
  await requireAdmin()

  // Never let a slug escape the posts directory.
  if (!/^[a-z0-9-]+$/.test(slug)) return { ok: false, error: 'Invalid slug' }

  try {
    await savePost(slug, changes, `content: update ${slug}`)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Publish failed' }
  }

  revalidatePath('/admin/posts')
  revalidatePath('/blog')
  revalidatePath(`/blog/${slug}`)
  return { ok: true }
}

export async function setPostStatus(
  slug: string,
  status: 'Published' | 'Draft' | 'Archived',
): Promise<ActionResult> {
  return updatePost(slug, { status })
}

export type NewProject = {
  name: string
  description: string
  year: string
  category: string
  tech: string[]
  cover: string
  liveUrl?: string
  githubUrl?: string
  body?: string
}

export async function addProject(
  input: NewProject,
): Promise<ActionResult & { slug?: string }> {
  await requireAdmin()

  const name = input.name.trim()
  const description = input.description.trim()
  if (!name) return { ok: false, error: 'Project name is required' }
  if (!description) return { ok: false, error: 'Description is required' }

  const slug = slugify(name)
  if (!slug) return { ok: false, error: 'Project name must contain letters or numbers' }

  try {
    await createProject(
      slug,
      {
        title: name,
        year: input.year.trim() || String(new Date().getFullYear()),
        description,
        tech: input.tech.filter(Boolean),
        category: input.category,
        cover: input.cover.trim(),
        links: { github: input.githubUrl?.trim(), live: input.liveUrl?.trim() },
        body: input.body?.trim() || description,
      },
      `content: add project ${slug}`,
    )
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save project' }
  }

  revalidatePath('/admin/projects')
  revalidatePath('/work')
  revalidatePath('/')
  return { ok: true, slug }
}

export async function editProject(
  slug: string,
  input: NewProject,
): Promise<ActionResult> {
  await requireAdmin()
  if (!/^[a-z0-9-]+$/.test(slug)) return { ok: false, error: 'Invalid slug' }

  const name = input.name.trim()
  const description = input.description.trim()
  if (!name) return { ok: false, error: 'Project name is required' }
  if (!description) return { ok: false, error: 'Description is required' }

  try {
    await saveProject(
      slug,
      {
        title: name,
        year: input.year.trim(),
        description,
        tech: input.tech.filter(Boolean),
        category: input.category,
        cover: input.cover.trim(),
        links: { github: input.githubUrl?.trim(), live: input.liveUrl?.trim() },
        body: input.body?.trim() || description,
      },
      `content: update project ${slug}`,
    )
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save project' }
  }

  revalidatePath('/admin/projects')
  revalidatePath('/work')
  revalidatePath('/')
  return { ok: true }
}

export async function updateSettings(settings: SiteSettings): Promise<ActionResult> {
  await requireAdmin()

  if (!settings.displayName.trim()) return { ok: false, error: 'Display name is required' }
  if (!settings.seo.title.trim()) return { ok: false, error: 'Site title is required' }

  try {
    await saveSettings(settings, 'content: update site settings')
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save settings' }
  }

  // Settings feed the layout metadata and the footer, so revalidate broadly.
  revalidatePath('/', 'layout')
  return { ok: true }
}
