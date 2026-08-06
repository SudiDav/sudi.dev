import { describe, it, expect } from 'vitest'
import { relativeTime, getApprovedComments, getCommentCounts } from './comments'

describe('relativeTime', () => {
  const now = new Date('2026-08-05T12:00:00Z').getTime()
  const ago = (ms: number) => new Date(now - ms).toISOString()

  it('reads as "just now" under a minute', () => {
    expect(relativeTime(ago(30_000), now)).toBe('just now')
  })

  it('singularises', () => {
    expect(relativeTime(ago(60_000), now)).toBe('1 minute ago')
    expect(relativeTime(ago(60 * 60_000), now)).toBe('1 hour ago')
  })

  it('pluralises', () => {
    expect(relativeTime(ago(5 * 60_000), now)).toBe('5 minutes ago')
    expect(relativeTime(ago(3 * 60 * 60_000), now)).toBe('3 hours ago')
  })

  it('rolls up to days', () => {
    expect(relativeTime(ago(2 * 24 * 60 * 60_000), now)).toBe('2 days ago')
  })

  it('never reports a negative age for a future timestamp', () => {
    expect(relativeTime(new Date(now + 60_000).toISOString(), now)).toBe('just now')
  })
})

describe('getApprovedComments', () => {
  it('returns only approved comments for the requested post', async () => {
    const comments = await getApprovedComments(
      'building-a-real-time-collaboration-engine-from-scratch',
    )
    expect(comments.every((comment) => comment.status === 'approved')).toBe(true)
    expect(
      comments.every(
        (comment) => comment.postSlug === 'building-a-real-time-collaboration-engine-from-scratch',
      ),
    ).toBe(true)
  })

  it('returns nothing for a post with no comments', async () => {
    expect(await getApprovedComments('does-not-exist')).toEqual([])
  })

  it('sorts oldest first, so a thread reads top to bottom', async () => {
    const comments = await getApprovedComments(
      'building-a-real-time-collaboration-engine-from-scratch',
    )
    const dates = comments.map((comment) => comment.createdAt)
    expect([...dates].sort()).toEqual(dates)
  })
})

describe('getCommentCounts', () => {
  it('counts every status, and All equals the total', async () => {
    const counts = await getCommentCounts()
    const byLabel = Object.fromEntries(counts.map((c) => [c.label, Number(c.value)]))
    expect(byLabel.All).toBe(byLabel.Pending + byLabel.Approved + byLabel.Spam)
  })
})
