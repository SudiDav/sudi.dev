'use server'

import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/auth'
import { savePost, type PostDraft } from '@/lib/publish'

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
