import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Comments live in `content/comments.json` — the same git-backed store as the
 * MDX and the site settings.
 *
 * That keeps the whole platform on one persistence model rather than adding a
 * database for one feature. The trade-off is real and worth naming: writes
 * serialise the entire file, so this suits a personal blog's volume, not a
 * high-traffic comment section.
 */
export type CommentStatus = 'pending' | 'approved' | 'spam'

export type Comment = {
  id: string
  postSlug: string
  author: string
  email: string
  body: string
  createdAt: string // ISO 8601
  status: CommentStatus
}

const FILE = join(process.cwd(), 'content', 'comments.json')

export async function getComments(): Promise<Comment[]> {
  try {
    const raw = await readFile(FILE, 'utf8')
    const parsed = JSON.parse(raw) as Comment[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Newest first, for the moderation queue. */
export async function getCommentsByStatus(status: CommentStatus | 'all'): Promise<Comment[]> {
  const all = await getComments()
  const filtered = status === 'all' ? all : all.filter((comment) => comment.status === status)
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Only approved comments are ever shown publicly. */
export async function getApprovedComments(postSlug: string): Promise<Comment[]> {
  const all = await getComments()
  return all
    .filter((comment) => comment.postSlug === postSlug && comment.status === 'approved')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getCommentCounts() {
  const all = await getComments()
  const count = (status: CommentStatus) => all.filter((c) => c.status === status).length
  return [
    { label: 'All', value: String(all.length), status: 'all' as const },
    { label: 'Pending', value: String(count('pending')), status: 'pending' as const },
    { label: 'Approved', value: String(count('approved')), status: 'approved' as const },
    { label: 'Spam', value: String(count('spam')), status: 'spam' as const },
  ]
}

/** "2 days ago" — the relative form the design shows. */
export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  // Each pair is "divide by this, and the result is in these units" — so the
  // label belongs to the value AFTER the division, not before it.
  const units: [number, string][] = [
    [60, 'minute'],
    [60, 'hour'],
    [24, 'day'],
    [7, 'week'],
    [4.35, 'month'],
    [12, 'year'],
  ]
  let value = seconds
  let unit = 'second'
  for (const [size, name] of units) {
    if (value < size) break
    value = Math.floor(value / size)
    unit = name
  }
  if (seconds < 60) return 'just now'
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`
}
