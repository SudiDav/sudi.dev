import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listAdminMock, countAllMock } = vi.hoisted(() => ({
  listAdminMock: vi.fn(),
  countAllMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('./comments/store', () => ({
  neonCommentStore: {
    listAdmin: listAdminMock,
    countAll: countAllMock,
  },
}))

import { getAdminCommentCount, getAdminComments } from './admin-comments'

describe('admin comment data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('passes an optional status filter to the comment store', async () => {
    listAdminMock.mockResolvedValue([])

    await expect(getAdminComments('pending')).resolves.toEqual({ comments: [], error: null })
    expect(listAdminMock).toHaveBeenCalledWith('pending')
  })

  it('returns an unavailable result when database access fails', async () => {
    listAdminMock.mockRejectedValue(new Error('DATABASE_URL is not configured'))

    const result = await getAdminComments()

    expect(result.comments).toEqual([])
    expect(result.error).toBe('DATABASE_URL is not configured')
  })

  it('returns the stored comment count', async () => {
    countAllMock.mockResolvedValue(14)

    await expect(getAdminCommentCount()).resolves.toEqual({ count: 14, error: null })
    expect(countAllMock).toHaveBeenCalledOnce()
  })
})
