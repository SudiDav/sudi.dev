import { notFound } from 'next/navigation'
import { getProject } from '@/lib/content'
import { isPublishingConfigured } from '@/lib/publish'
import { ProjectForm } from '../../new/project-form'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminEditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const project = await getProject((await params).slug)
  if (!project) notFound()

  return <ProjectForm canPublish={isPublishingConfigured()} project={project} />
}
