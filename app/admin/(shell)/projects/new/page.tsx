import { isPublishingConfigured } from '@/lib/publish'
import { ProjectForm } from './project-form'

export const metadata = { robots: { index: false, follow: false } }

/**
 * Design: "Admin — Add Project" — a top bar of Cancel / Save & Publish, then a
 * two-column form (fluid left, 360 right).
 *
 * The form writes a new MDX file to content/projects. Two deviations from the
 * frame, both because the design's fields do not cover what the site needs:
 * a Category select (the Work page filters by it) and a cover path field
 * (there is no asset store to upload into yet). Both are commented in the form.
 */
export default function AdminAddProjectPage() {
  return <ProjectForm canPublish={isPublishingConfigured()} />
}
