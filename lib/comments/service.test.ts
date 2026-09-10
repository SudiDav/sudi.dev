import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicComment } from './types'
import type { CommentStore, NewComment, ParentComment } from './store'
import { deleteComment, getPublishedComments, moderateComment, submitComment } from './service'

vi.mock('server-only', () => ({}))

class MemoryCommentStore implements CommentStore {
  inserted: NewComment[] = []
  parents = new Map<string, ParentComment>()
  published: PublicComment[] = []
  lastCreated: Date | null = null
  statuses = new Map<string, string>()
  deleted = new Set<string>()

  async listPublished() {
    return this.published
  }

  async findParent(id: string) {
    return this.parents.get(id) ?? null
  }

  async lastCreatedAt() {
    return this.lastCreated
  }

  async insert(comment: NewComment) {
    this.inserted.push(comment)
    return {
      id: '01991c35-a812-7000-8000-000000000001',
      parentId: comment.parentId,
      authorName: comment.authorName,
      authorAvatarUrl: comment.authorAvatarUrl,
      authorType: comment.authorType,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
    }
  }

  async listAdmin() {
    return []
  }

  async countAll() {
    return 0
  }

  async setStatus(id: string, status: string) {
    this.statuses.set(id, status)
    return true
  }

  async deleteById(id: string) {
    this.deleted.add(id)
    return true
  }
}

const now = new Date('2026-09-10T10:00:00.000Z')
const input = {
  articleSlug: 'after-amen',
  parentId: null,
  guestName: '',
  body: 'I agree.',
}

describe('submitComment', () => {
  let store: MemoryCommentStore

  beforeEach(() => {
    store = new MemoryCommentStore()
  })

  it('publishes an authenticated Google comment', async () => {
    const result = await submitComment(store, {
      input,
      identity: {
        type: 'google',
        subject: 'reader-123',
        name: 'Ada',
        avatarUrl: 'https://images.example/ada.png',
      },
      actorKey: 'actor-key',
      now,
    })

    expect(result).toMatchObject({ ok: true, status: 'published' })
    expect(store.inserted).toEqual([
      expect.objectContaining({
        status: 'published',
        authorType: 'google',
        authorKey: 'actor-key',
        actorKey: 'actor-key',
        authorName: 'Ada',
      }),
    ])
  })

  it('holds a guest comment for moderation', async () => {
    const result = await submitComment(store, {
      input: { ...input, guestName: 'Maya' },
      identity: { type: 'guest', name: 'Maya' },
      actorKey: 'guest-key',
      now,
    })

    expect(result).toEqual({ ok: true, status: 'pending' })
    expect(store.inserted[0]).toMatchObject({
      status: 'pending',
      authorType: 'guest',
      authorKey: null,
      authorAvatarUrl: null,
    })
  })

  it('requires a guest display name', async () => {
    const result = await submitComment(store, {
      input,
      identity: { type: 'guest', name: '' },
      actorKey: 'guest-key',
      now,
    })

    expect(result).toEqual({ ok: false, message: 'Enter your name before commenting.' })
    expect(store.inserted).toHaveLength(0)
  })

  it('throttles the same actor for 60 seconds', async () => {
    store.lastCreated = new Date('2026-09-10T09:59:30.000Z')

    const result = await submitComment(store, {
      input,
      identity: { type: 'github', subject: '42', name: 'Lin', avatarUrl: null },
      actorKey: 'actor-key',
      now,
    })

    expect(result).toEqual({
      ok: false,
      message: 'Please wait a moment before commenting again.',
    })
    expect(store.inserted).toHaveLength(0)
  })

  it.each([
    ['missing', null],
    [
      'different article',
      {
        id: '01991c35-a812-7000-8000-000000000010',
        articleSlug: 'another-post',
        parentId: null,
        status: 'published' as const,
      },
    ],
    [
      'unpublished',
      {
        id: '01991c35-a812-7000-8000-000000000010',
        articleSlug: 'after-amen',
        parentId: null,
        status: 'pending' as const,
      },
    ],
    [
      'already nested',
      {
        id: '01991c35-a812-7000-8000-000000000010',
        articleSlug: 'after-amen',
        parentId: '01991c35-a812-7000-8000-000000000011',
        status: 'published' as const,
      },
    ],
  ])('rejects a %s reply target', async (_label, parent) => {
    const parentId = '01991c35-a812-7000-8000-000000000010'
    if (parent) store.parents.set(parentId, parent)

    const result = await submitComment(store, {
      input: { ...input, parentId },
      identity: { type: 'github', subject: '42', name: 'Lin', avatarUrl: null },
      actorKey: 'actor-key',
      now,
    })

    expect(result).toEqual({
      ok: false,
      message: 'That reply target is no longer available.',
    })
  })
})

describe('comment reads and moderation', () => {
  it('returns the published DTOs supplied by the store', async () => {
    const store = new MemoryCommentStore()
    store.published = [
      {
        id: '01991c35-a812-7000-8000-000000000001',
        parentId: null,
        authorName: 'Ada',
        authorAvatarUrl: null,
        authorType: 'google',
        body: 'A useful comment.',
        createdAt: '2026-09-10T10:00:00.000Z',
      },
    ]

    await expect(getPublishedComments(store, 'after-amen')).resolves.toEqual(store.published)
  })

  it('rejects an unsupported moderation status', async () => {
    const store = new MemoryCommentStore()

    await expect(moderateComment(store, 'comment-id', 'pending')).resolves.toBe(false)
    expect(store.statuses.size).toBe(0)
  })

  it('publishes a comment through moderation', async () => {
    const store = new MemoryCommentStore()

    await expect(moderateComment(store, 'comment-id', 'published')).resolves.toBe(true)
    expect(store.statuses.get('comment-id')).toBe('published')
  })

  it('deletes a comment through the store', async () => {
    const store = new MemoryCommentStore()

    await expect(deleteComment(store, 'comment-id')).resolves.toBe(true)
    expect(store.deleted.has('comment-id')).toBe(true)
  })
})
