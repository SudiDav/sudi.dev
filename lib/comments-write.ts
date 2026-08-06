import 'server-only'
import { randomUUID } from 'node:crypto'
import { getComments, type Comment, type CommentStatus } from './comments'
import { writeJson } from './publish'

/**
 * Writes go through the same publish layer as content: the local working copy
 * in development, a commit to the repo when a GitHub token is configured.
 */
const FILE = 'content/comments.json'

export async function addComment(input: {
  postSlug: string
  author: string
  email: string
  body: string
}): Promise<Comment> {
  const comment: Comment = {
    id: randomUUID(),
    postSlug: input.postSlug,
    author: input.author,
    email: input.email,
    body: input.body,
    createdAt: new Date().toISOString(),
    // Nothing appears publicly until it is approved.
    status: 'pending',
  }
  const all = await getComments()
  await writeJson(FILE, [...all, comment], `content: new comment on ${input.postSlug}`)
  return comment
}

export async function moderateComment(id: string, status: CommentStatus) {
  const all = await getComments()
  if (!all.some((comment) => comment.id === id)) throw new Error('Comment not found')
  const next = all.map((comment) => (comment.id === id ? { ...comment, status } : comment))
  await writeJson(FILE, next, `content: mark comment ${status}`)
}

export async function deleteComment(id: string) {
  const all = await getComments()
  await writeJson(FILE, all.filter((comment) => comment.id !== id), 'content: delete comment')
}
