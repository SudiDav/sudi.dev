'use server'

import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/auth'
import {
  savePost,
  createProject,
  saveProject,
  saveSettings,
  slugify,
  writeJson,
  type PostDraft,
} from '@/lib/publish'
import type { SiteSettings } from '@/lib/site'
import { addComment, moderateComment, deleteComment } from '@/lib/comments-write'
import { getSubscribers } from '@/lib/subscribers'

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

export async function moderate(
  id: string,
  status: 'pending' | 'approved' | 'spam',
): Promise<ActionResult> {
  await requireAdmin()
  try {
    await moderateComment(id, status)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not update comment' }
  }
  revalidatePath('/admin/comments')
  revalidatePath('/blog', 'layout')
  return { ok: true }
}

export async function removeComment(id: string): Promise<ActionResult> {
  await requireAdmin()
  try {
    await deleteComment(id)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not delete comment' }
  }
  revalidatePath('/admin/comments')
  revalidatePath('/blog', 'layout')
  return { ok: true }
}

/**
 * Public: anyone reading an article can leave a comment. It is stored as
 * pending and never appears on the site until it is approved in the admin,
 * so this action deliberately does NOT require an admin session.
 */
export async function submitComment(input: {
  postSlug: string
  author: string
  email: string
  body: string
}): Promise<ActionResult> {
  const author = input.author.trim()
  const email = input.email.trim()
  const body = input.body.trim()

  if (!author) return { ok: false, error: 'Please add your name' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Please add a valid email' }
  if (body.length < 2) return { ok: false, error: 'Please write a comment' }
  if (body.length > 2000) return { ok: false, error: 'Comment is too long (2000 characters max)' }

  try {
    await addComment({ postSlug: input.postSlug, author, email, body })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not post comment' }
  }
  revalidatePath('/admin/comments')
  return { ok: true }
}

/**
 * Public: newsletter sign-up.
 *
 * Stores the address in content/subscribers.json. This is a list you own, not
 * a mailing integration — sending actually requires an email provider. Storing
 * addresses now means none are lost before that exists.
 */
export async function subscribe(email: string): Promise<ActionResult> {
  const address = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { ok: false, error: 'Please enter a valid email address' }
  }

  try {
    const existing = await getSubscribers()
    if (existing.some((entry) => entry.email === address)) return { ok: true }
    await writeJson(
      'content/subscribers.json',
      [...existing, { email: address, subscribedAt: new Date().toISOString() }],
      'content: new subscriber',
    )
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not subscribe' }
  }
  return { ok: true }
}
