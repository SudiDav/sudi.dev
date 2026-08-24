import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { getDeploymentStatus } from './vercel-deployments'

describe('Vercel deployment status', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('finds a ready deployment by GitHub commit SHA', async () => {
    process.env.VERCEL_TOKEN = 'vercel-test-token'
    process.env.VERCEL_PROJECT_ID = 'prj_test'
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          deployments: [
            {
              uid: 'dpl_ready',
              readyState: 'READY',
              url: 'sudi-dev-abc.vercel.app',
              meta: { githubCommitSha: 'abc123' },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getDeploymentStatus('abc123')).resolves.toEqual({
      status: 'ready',
      url: 'https://sudi-dev-abc.vercel.app',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.vercel.com/v6/deployments?projectId=prj_test&limit=20',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer vercel-test-token' }),
      }),
    )
  })

  it('reports an unavailable status when Vercel credentials are absent', async () => {
    delete process.env.VERCEL_TOKEN
    delete process.env.VERCEL_PROJECT_ID

    await expect(getDeploymentStatus('abc123')).resolves.toEqual({
      status: 'unavailable',
      error: 'Vercel deployment status is not configured.',
    })
  })
})
