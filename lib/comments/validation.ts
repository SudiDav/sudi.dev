import type { SubmitCommentInput, ValidatedSubmission } from './types'

type ValidationResult =
  | { ok: true; value: ValidatedSubmission }
  | { ok: false; message: string }

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateSubmission(input: SubmitCommentInput): ValidationResult {
  const articleSlug = input.articleSlug.trim()
  const parentId = input.parentId?.trim() || null
  const guestName = input.guestName.trim()
  const body = input.body.trim()

  if (!SLUG_PATTERN.test(articleSlug)) {
    return { ok: false, message: 'This article cannot accept comments.' }
  }
  if (parentId && !UUID_PATTERN.test(parentId)) {
    return { ok: false, message: 'That reply target is no longer available.' }
  }
  if (guestName.length > 80) {
    return { ok: false, message: 'Use a name with 80 characters or fewer.' }
  }
  if (!body) {
    return { ok: false, message: 'Write a comment before posting.' }
  }
  if (body.length > 4000) {
    return { ok: false, message: 'Keep your comment to 4,000 characters or fewer.' }
  }
  if ((body.match(/https?:\/\//gi)?.length ?? 0) > 2) {
    return { ok: false, message: 'Comments can include at most two links.' }
  }

  return { ok: true, value: { articleSlug, parentId, guestName, body } }
}
