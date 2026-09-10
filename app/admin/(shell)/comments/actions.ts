'use server'

import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/auth'
import { neonCommentStore } from '@/lib/comments/store'
import type { ModerationStatus } from '@/lib/comments/types'

type CommentActionResult = { ok: true } | { ok: false; message: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MODERATION_STATUSES = new Set<ModerationStatus>(['published', 'rejected', 'spam'])

async function articleSlugFor(id: string) {
  const comments = await neonCommentStore.listAdmin()
  return comments.find((comment) => comment.id === id)?.articleSlug ?? null
}

function revalidateCommentViews(articleSlug: string) {
  revalidatePath('/admin/comments')
  revalidatePath('/admin')
  revalidatePath(`/blog/${articleSlug}`)
}

export async function moderateCommentAction(
  id: string,
  status: string,
): Promise<CommentActionResult> {
  if (!(await isAdmin())) return { ok: false, message: 'Not authorised.' }
  if (!UUID_PATTERN.test(id) || !MODERATION_STATUSES.has(status as ModerationStatus)) {
    return { ok: false, message: 'Invalid comment update.' }
  }

  try {
    const articleSlug = await articleSlugFor(id)
    if (!articleSlug) return { ok: false, message: 'Comment not found.' }
    const updated = await neonCommentStore.setStatus(id, status as ModerationStatus)
    if (!updated) return { ok: false, message: 'Comment not found.' }
    revalidateCommentViews(articleSlug)
    return { ok: true }
  } catch {
    console.error('Unable to moderate comment')
    return { ok: false, message: 'The comment could not be updated. Please try again.' }
  }
}

export async function deleteCommentAction(id: string): Promise<CommentActionResult> {
  if (!(await isAdmin())) return { ok: false, message: 'Not authorised.' }
  if (!UUID_PATTERN.test(id)) return { ok: false, message: 'Invalid comment update.' }

  try {
    const articleSlug = await articleSlugFor(id)
    if (!articleSlug) return { ok: false, message: 'Comment not found.' }
    const deleted = await neonCommentStore.deleteById(id)
    if (!deleted) return { ok: false, message: 'Comment not found.' }
    revalidateCommentViews(articleSlug)
    return { ok: true }
  } catch {
    console.error('Unable to delete comment')
    return { ok: false, message: 'The comment could not be deleted. Please try again.' }
  }
}
