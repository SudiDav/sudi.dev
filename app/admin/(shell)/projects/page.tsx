import Link from 'next/link'
import { Plus, Folder, Star, Pencil, ExternalLink, Ellipsis } from 'lucide-react'
import { AdminTopBar } from '@/components/admin/admin-ui'
import { type AdminProjectStatus } from '@/lib/admin-fixtures'
import { getAdminProjects } from '@/lib/admin-data'

/** Design: the status pill keeps the badge shape across all four vocabularies. */
const PROJECT_STATUS: Record<AdminProjectStatus, string> = {
  Featured: 'bg-[#10B98115] text-accent',
  Active: 'bg-[#10B98115] text-admin-success',
  Archived: 'bg-[#9CA3AF15] text-admin-text-tertiary',
  WIP: 'bg-[#F59E0B15] text-admin-warning',
}

/**
 * Design: "Admin — Projects" — a card grid (rows of two, gap 16). Each card is
 * padding 20 / gap 14 / radius 12 with a folder icon, a status pill, the
 * description, a Geist Mono tech line, then a footer above a 1px top rule
 * carrying the view count and three action icons.
 */
export default async function AdminProjectsPage() {
  const projects = await getAdminProjects()

  return (
    <>
      <AdminTopBar title="Projects">
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Add Project
        </Link>
      </AdminTopBar>

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <article
            key={project.name}
            className="flex flex-col gap-3.5 rounded-xl border border-admin-border bg-admin-card p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Folder size={18} className="text-accent" />
                <h2 className="font-display text-[15px] font-semibold text-admin-text">
                  {project.name}
                </h2>
              </div>
              <span
                className={`rounded-xl px-2.5 py-1 text-xs font-medium ${PROJECT_STATUS[project.status]}`}
              >
                {project.status}
              </span>
            </div>

            <p className="text-[13px] leading-[1.5] text-admin-text-secondary">
              {project.description}
            </p>

            <p className="font-mono text-[11px] text-admin-text-tertiary">{project.tech}</p>

            <div className="flex-1" />

            <div className="flex items-center justify-between border-t border-admin-border pt-3">
              <span className="flex items-center gap-1 text-xs text-admin-text-tertiary">
                <Star size={13} />
                {project.views}
              </span>
              <div className="flex items-center gap-3 text-admin-text-tertiary">
                <Pencil size={14} />
                <ExternalLink size={14} />
                <Ellipsis size={14} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
