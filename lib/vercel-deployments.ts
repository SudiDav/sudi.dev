import 'server-only'

export type DeploymentState = 'queued' | 'building' | 'ready' | 'error' | 'unavailable'

export type DeploymentStatus = {
  status: DeploymentState
  url?: string
  error?: string
}

type VercelDeployment = {
  readyState?: string
  state?: string
  url?: string
  meta?: { githubCommitSha?: string }
  gitSource?: { sha?: string }
}

function deploymentUrl(url?: string): string | undefined {
  if (!url) return undefined
  return url.startsWith('http') ? url : `https://${url}`
}

function mapState(deployment: VercelDeployment): DeploymentState {
  const state = (deployment.readyState ?? deployment.state ?? '').toUpperCase()
  if (state === 'READY') return 'ready'
  if (state === 'ERROR' || state === 'CANCELED') return 'error'
  if (state === 'QUEUED') return 'queued'
  return 'building'
}

export async function getDeploymentStatus(sha: string): Promise<DeploymentStatus> {
  const token = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) {
    return {
      status: 'unavailable',
      error: 'Vercel deployment status is not configured.',
    }
  }

  const endpoint = `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=20`
  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!response.ok) {
      return { status: 'unavailable', error: 'Could not check Vercel deployment status.' }
    }

    const body = (await response.json()) as { deployments?: VercelDeployment[] }
    const deployment = body.deployments?.find(
      (item) => item.meta?.githubCommitSha === sha || item.gitSource?.sha === sha,
    )
    if (!deployment) return { status: 'queued' }

    return { status: mapState(deployment), url: deploymentUrl(deployment.url) }
  } catch {
    return { status: 'unavailable', error: 'Could not check Vercel deployment status.' }
  }
}
