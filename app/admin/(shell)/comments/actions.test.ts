import { beforeEach, describe, expect, it, vi } from 'vitest'

const { isAdminMock, listAdminMock, setStatusMock, deleteByIdMock, revalidatePathMock } =
  vi.hoisted(() => ({
    isAdminMock: vi.fn(),
    listAdminMock: vi.fn(),
    setStatusMock: vi.fn(),
    deleteByIdMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  }))

vi.mock('@/auth', () => ({ isAdmin: isAdminMock }))
vi.mock('@/lib/comments/store', () => ({
  neonCommentStore: {
    listAdmin: listAdminMock,
    setStatus: setStatusMock,
    deleteById: deleteByIdMock,
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))

import { deleteCommentAction, moderateCommentAction } from './actions'

const COMMENT_ID = '01991c35-a812-7000-8000-000000000001'
const stored = {
  id: COMMENT_ID,
  articleSlug: 'after-amen',
  parentId: null,
  authorName: 'Maya',
  authorAvatarUrl: null,
  authorType: 'guest',
  body: 'A thoughtful response.',
  status: 'pending',
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-10T10:00:00.000Z',
}

describe('admin comment actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAdminMock.mockResolvedValue(true)
    listAdminMock.mockResolvedValue([stored])
    setStatusMock.mockResolvedValue(true)
    deleteByIdMock.mockResolvedValue(true)
  })

  it('does not mutate when the caller is not the admin', async () => {
    isAdminMock.mockResolvedValue(false)

    await expect(moderateCommentAction(COMMENT_ID, 'published')).resolves.toEqual({
      ok: false,
      message: 'Not authorised.',
    })
    expect(setStatusMock).not.toHaveBeenCalled()
  })

  it.each(['published', 'rejected', 'spam'] as const)('sets the allowed %s status', async (status) => {
    await expect(moderateCommentAction(COMMENT_ID, status)).resolves.toEqual({ ok: true })
    expect(setStatusMock).toHaveBeenCalledWith(COMMENT_ID, status)
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/comments')
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin')
    expect(revalidatePathMock).toHaveBeenCalledWith('/blog/after-amen')
  })

  it('rejects an unknown status', async () => {
    await expect(moderateCommentAction(COMMENT_ID, 'pending')).resolves.toEqual({
      ok: false,
      message: 'Invalid comment update.',
    })
    expect(listAdminMock).not.toHaveBeenCalled()
    expect(setStatusMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed comment id', async () => {
    await expect(moderateCommentAction('not-an-id', 'published')).resolves.toEqual({
      ok: false,
      message: 'Invalid comment update.',
    })
    expect(listAdminMock).not.toHaveBeenCalled()
    expect(setStatusMock).not.toHaveBeenCalled()
  })

  it('deletes an existing comment and revalidates its article', async () => {
    await expect(deleteCommentAction(COMMENT_ID)).resolves.toEqual({ ok: true })
    expect(deleteByIdMock).toHaveBeenCalledWith(COMMENT_ID)
    expect(revalidatePathMock).toHaveBeenCalledWith('/blog/after-amen')
  })
})
