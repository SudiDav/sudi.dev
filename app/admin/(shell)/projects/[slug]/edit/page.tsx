import { notFound } from 'next/navigation'
import { getLatestProjectSnapshot, isPublishingConfigured } from '@/lib/publish'
import { ProjectForm } from '../../new/project-form'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminEditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const snapshot = await getLatestProjectSnapshot((await params).slug)
  if (!snapshot) notFound()

  return (
    <ProjectForm
      key={snapshot.project.slug}
      canPublish={isPublishingConfigured()}
      project={snapshot.project}
      initialVersion={snapshot.version}
    />
  )
}
