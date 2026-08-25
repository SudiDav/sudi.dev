'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { PublishResult } from '@/lib/publish'

type Status = 'committed' | 'queued' | 'building' | 'ready' | 'error' | 'unavailable'

const labels: Record<Status, string> = {
  committed: 'Commit created — checking deployment…',
  queued: 'Deployment queued…',
  building: 'Deployment in progress…',
  ready: 'Deployment complete — changes are live.',
  error: 'Deployment failed. The commit is safe; check Vercel for details.',
  unavailable: 'Deployment status is unavailable. The commit was created successfully.',
}

export function DeploymentStatus({ publish }: { publish?: PublishResult | null }) {
  const [status, setStatus] = useState<Status>(publish?.target === 'local' ? 'ready' : 'committed')
  const [url, setUrl] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!publish || publish.target === 'local' || !publish.sha) return
    let active = true
    let attempts = 0

    const check = async () => {
      try {
        const response = await fetch(
          `/api/admin/deployment-status?sha=${encodeURIComponent(publish.sha!)}`,
          { cache: 'no-store' },
        )
        if (!response.ok) throw new Error('Status request failed')
        const result = (await response.json()) as {
          status?: Exclude<Status, 'committed'>
          url?: string
          error?: string
        }
        if (!active) return
        setStatus(result.status ?? 'unavailable')
        setUrl(result.url)
        setError(result.error)
        attempts += 1
        if (result.status === 'ready' || result.status === 'error' || result.status === 'unavailable') {
          active = false
        }
      } catch {
        if (active) {
          attempts += 1
          if (attempts >= 40) {
            setStatus('unavailable')
            active = false
          }
        }
      }
    }

    void check()
    const interval = window.setInterval(() => {
      if (active) void check()
    }, 3000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [publish])

  if (!publish) return null

  const icon =
    status === 'ready' ? (
      <CheckCircle2 size={15} className="text-admin-success" />
    ) : status === 'error' || status === 'unavailable' ? (
      <TriangleAlert size={15} className="text-admin-warning" />
    ) : (
      <LoaderCircle size={15} className="animate-spin text-accent" />
    )

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-admin-text-secondary">
      {icon}
      <span>{publish.target === 'local' ? 'Saved locally.' : labels[status]}</span>
      {error ? <span className="text-admin-text-tertiary">{error}</span> : null}
      {publish.commitUrl ? (
        <a
          href={publish.commitUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:underline"
        >
          View commit <ExternalLink size={12} />
        </a>
      ) : null}
      {url && status === 'ready' ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          View deployment
        </a>
      ) : null}
    </div>
  )
}
