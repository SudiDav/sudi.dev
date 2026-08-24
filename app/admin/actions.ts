'use server'

import { revalidatePath } from 'next/cache'
import { addToAudience, notifyNewSubscriber } from '@/lib/email'
import { isAdmin } from '@/auth'
import { savePost,
  createPost,
  createProject,
  saveProject,
  saveSettings,
  slugify,
  type PostDraft, uploadImage } from '@/lib/publish'
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

export type NewPost = {
  title: string
  excerpt: string
  body: string
  category: string
  status: 'Published' | 'Draft' | 'Archived'
  cover: string
}

/** Create a post from the editor's "new" route. Returns the slug it minted. */
export async function addPost(input: NewPost): Promise<ActionResult & { slug?: string }> {
  await requireAdmin()

  const title = input.title.trim()
  if (!title) return { ok: false, error: 'A title is required' }

  const slug = slugify(title)
  if (!slug) return { ok: false, error: 'The title must contain letters or numbers' }
  // `new` is the editor's own create route; a post with that slug would shadow it.
  if (slug === 'new') return { ok: false, error: 'That title is reserved — pick another' }

  const words = input.body.trim().split(/\s+/).filter(Boolean).length

  try {
    await createPost(
      slug,
      {
        title,
        excerpt: input.excerpt.trim(),
        date: new Date().toISOString().slice(0, 10),
        readingTime: `${Math.max(1, Math.round(words / 200))} min read`,
        category: input.category,
        cover: input.cover.trim() || '/images/sudi.jpeg',
        featured: false,
        status: input.status,
        body: input.body,
      },
      `content: add post ${slug}`,
    )
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not create post' }
  }

  revalidatePath('/admin/posts')
  revalidatePath('/blog')
  return { ok: true, slug }
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

/**
 * Public: newsletter sign-up.
 *
 * The address goes to the Resend audience and a notification goes to
 * CONTACT_EMAIL. It is deliberately NOT written into the repository: the repo
 * is public so GitHub Discussions can back the comments, and subscriber
 * addresses have no business being published with the source.
 *
 * Neither call is allowed to fail the sign-up. Resend being down is not the
 * subscriber's problem, and showing them an error only invites a second submit;
 * the failure is logged for you instead.
 */
export async function subscribe(email: string): Promise<ActionResult> {
  const address = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { ok: false, error: 'Please enter a valid email address' }
  }

  const [stored, notified] = await Promise.all([
    addToAudience(address),
    notifyNewSubscriber(address),
  ])

  if (!stored.sent) console.warn(`[newsletter] ${address} not added to audience: ${stored.reason}`)
  if (!notified.sent) console.warn(`[newsletter] no notification sent: ${notified.reason}`)

  return { ok: true }
}

/**
 * Admin: upload a cover image.
 *
 * Takes FormData rather than a File argument because that is what a file input
 * gives a server action without any client-side encoding.
 */
export async function uploadCoverImage(
  form: FormData,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  await requireAdmin()

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'No file was received' }
  }

  try {
    return { ok: true, path: await uploadImage(file) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Upload failed' }
  }
}
