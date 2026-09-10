import 'server-only'

import type { CommentStore, NewComment } from './store'
import type {
  CommentIdentity,
  CommentStatus,
  ModerationStatus,
  SubmitCommentInput,
  SubmitCommentResult,
} from './types'
import { validateSubmission } from './validation'

const COMMENT_COOLDOWN_MS = 60_000

type SubmitCommand = {
  input: SubmitCommentInput
  identity: CommentIdentity
  actorKey: string
  now: Date
}

export async function submitComment(
  store: CommentStore,
  command: SubmitCommand,
): Promise<SubmitCommentResult> {
  const validated = validateSubmission(command.input)
  if (!validated.ok) return validated

  const { articleSlug, parentId, guestName, body } = validated.value
  if (command.identity.type === 'guest' && !guestName) {
    return { ok: false, message: 'Enter your name before commenting.' }
  }

  const lastCreatedAt = await store.lastCreatedAt(command.actorKey)
  if (lastCreatedAt && command.now.getTime() - lastCreatedAt.getTime() < COMMENT_COOLDOWN_MS) {
    return { ok: false, message: 'Please wait a moment before commenting again.' }
  }

  if (parentId) {
    const parent = await store.findParent(parentId)
    if (
      !parent ||
      parent.articleSlug !== articleSlug ||
      parent.status !== 'published' ||
      parent.parentId
    ) {
      return { ok: false, message: 'That reply target is no longer available.' }
    }
  }

  const authenticated = command.identity.type !== 'guest'
  const status: CommentStatus = authenticated ? 'published' : 'pending'
  const newComment: NewComment = {
    articleSlug,
    parentId,
    authorType: command.identity.type,
    authorKey: authenticated ? command.actorKey : null,
    authorName: authenticated ? command.identity.name.trim() || 'Reader' : guestName,
    authorAvatarUrl: command.identity.type === 'guest' ? null : command.identity.avatarUrl,
    body,
    status,
    actorKey: command.actorKey,
    createdAt: command.now,
  }
  const comment = await store.insert(newComment)

  return status === 'published'
    ? { ok: true, status, comment }
    : { ok: true, status: 'pending' }
}

export function getPublishedComments(store: CommentStore, articleSlug: string) {
  return store.listPublished(articleSlug)
}

export function moderateComment(
  store: CommentStore,
  id: string,
  status: CommentStatus,
): Promise<boolean> {
  if (!(['published', 'rejected', 'spam'] satisfies ModerationStatus[]).includes(status as ModerationStatus)) {
    return Promise.resolve(false)
  }
  return store.setStatus(id, status as ModerationStatus)
}

export function deleteComment(store: CommentStore, id: string) {
  return store.deleteById(id)
}
