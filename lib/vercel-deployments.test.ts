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
              target: 'production',
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
      'https://api.vercel.com/v6/deployments?projectId=prj_test&limit=20&target=production',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer vercel-test-token' }),
      }),
    )
  })

  it('uses the matching production deployment when preview and production results are mixed', async () => {
    process.env.VERCEL_TOKEN = 'vercel-test-token'
    process.env.VERCEL_PROJECT_ID = 'prj_test'
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          deployments: [
            {
              readyState: 'READY',
              target: null,
              url: 'preview.vercel.app',
              meta: { githubCommitSha: 'abc123' },
            },
            {
              readyState: 'ERROR',
              target: 'production',
              url: 'production.vercel.app',
              meta: { githubCommitSha: 'abc123' },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getDeploymentStatus('abc123')).resolves.toEqual({
      status: 'error',
      url: 'https://production.vercel.app',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('&target=production'),
      expect.anything(),
    )
  })

  it('still requires an exact commit SHA match among production deployments', async () => {
    process.env.VERCEL_TOKEN = 'vercel-test-token'
    process.env.VERCEL_PROJECT_ID = 'prj_test'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            deployments: [
              { readyState: 'READY', target: 'production', meta: { githubCommitSha: 'abc1234' } },
              { readyState: 'READY', target: null, meta: { githubCommitSha: 'abc123' } },
            ],
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(getDeploymentStatus('abc123')).resolves.toEqual({ status: 'queued' })
  })

  it('preserves an in-progress production status when a ready preview shares its SHA', async () => {
    process.env.VERCEL_TOKEN = 'vercel-test-token'
    process.env.VERCEL_PROJECT_ID = 'prj_test'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            deployments: [
              { readyState: 'READY', target: null, meta: { githubCommitSha: 'abc123' } },
              { readyState: 'BUILDING', target: 'production', meta: { githubCommitSha: 'abc123' } },
            ],
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(getDeploymentStatus('abc123')).resolves.toEqual({ status: 'building', url: undefined })
  })

  it('preserves the unavailable response when Vercel returns an error', async () => {
    process.env.VERCEL_TOKEN = 'vercel-test-token'
    process.env.VERCEL_PROJECT_ID = 'prj_test'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))

    await expect(getDeploymentStatus('abc123')).resolves.toEqual({
      status: 'unavailable',
      error: 'Could not check Vercel deployment status.',
    })
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
