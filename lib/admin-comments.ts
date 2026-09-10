import 'server-only'

import { neonCommentStore } from './comments/store'
import type { AdminComment, CommentStatus } from './comments/types'

export type AdminCommentsResult = {
  comments: AdminComment[]
  error: string | null
}

/** Load comments from the same store used by the public article threads. */
export async function getAdminComments(status?: CommentStatus): Promise<AdminCommentsResult> {
  try {
    return { comments: await neonCommentStore.listAdmin(status), error: null }
  } catch (error) {
    console.error('Unable to load comments for the admin')
    return {
      comments: [],
      error: error instanceof Error ? error.message : 'Comments are unavailable',
    }
  }
}

export async function getAdminCommentCount() {
  try {
    return { count: await neonCommentStore.countAll(), error: null }
  } catch {
    console.error('Unable to count comments for the admin dashboard')
    return { count: 0, error: 'Comments are unavailable' }
  }
}
