import Link from 'next/link'
import { Upload, X } from 'lucide-react'
import { AdminCard } from '@/components/admin/admin-ui'

/**
 * Design: "Admin — Add Project" — a top bar of Cancel / Save Draft /
 * Save & Publish, then a two-column form (fluid left, 360 right).
 *
 * Presentational, as designed — nothing persists. Placeholders come from the
 * frame verbatim.
 */
function Field({
  label,
  placeholder,
  textarea,
  defaultValue,
  rows = 3,
}: {
  label: string
  placeholder?: string
  textarea?: boolean
  defaultValue?: string
  rows?: number
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`
  const shared =
    'rounded-lg border border-admin-border bg-white px-3.5 py-2.5 text-[13px] text-admin-text placeholder:text-admin-text-tertiary focus:border-accent focus:outline-none'
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-admin-text-secondary">
        {label}
      </label>
      {textarea ? (
        <textarea id={id} rows={rows} placeholder={placeholder} defaultValue={defaultValue} className={shared} />
      ) : (
        <input id={id} placeholder={placeholder} defaultValue={defaultValue} className={shared} />
      )}
    </div>
  )
}

const TECH = ['React', 'TypeScript']

/** Design: "Display Settings" — two toggles, both on. */
const TOGGLES = [
  { label: 'Featured Project', description: 'Show on homepage' },
  { label: 'Show on Work Page', description: 'List in portfolio projects' },
]

export default function AdminAddProjectPage() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-2 text-xs text-admin-text-tertiary">
            <Link href="/admin/projects" className="hover:text-admin-text">
              Projects
            </Link>
            <span>/</span>
            <span className="text-admin-text-secondary">Add New Project</span>
          </nav>
          <h1 className="font-display text-[26px] font-bold text-admin-text">Add New Project</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/projects"
            className="rounded-lg border border-admin-border px-4 py-2 text-[13px] font-medium text-admin-text-secondary"
          >
            Cancel
          </Link>
          <button
            type="button"
            className="rounded-lg border border-admin-border px-4 py-2 text-[13px] font-medium text-admin-text-secondary"
          >
            Save Draft
          </button>
          <button
            type="button"
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Save &amp; Publish
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-7 xl:flex-row">
        <div className="flex flex-1 flex-col gap-5">
          <AdminCard title="Project Details">
            <Field label="Project Name *" placeholder="e.g. CollabSync" />
            <Field label="Description *" textarea placeholder="Brief description of the project..." />
            <div className="flex flex-col gap-4 sm:flex-row">
              <Field label="Year" defaultValue="2026" />
              <Field label="Status" defaultValue="Active" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-admin-text-secondary">Tech Stack</span>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-admin-border bg-white p-2.5">
                {TECH.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent-dim px-3 py-1 text-[11px] text-accent"
                  >
                    {tech}
                    <X size={12} />
                  </span>
                ))}
                <input
                  aria-label="Add technology"
                  placeholder="Add technology..."
                  className="flex-1 bg-transparent text-xs text-admin-text placeholder:text-admin-text-tertiary focus:outline-none"
                />
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Links">
            <Field label="Live URL" placeholder="https://myproject.dev" />
            <Field label="GitHub Repository" placeholder="https://github.com/sudidavid/..." />
            <Field label="Case Study / Blog Post" placeholder="https://sudidavid.dev/blog/..." />
          </AdminCard>
        </div>

        <div className="flex w-full flex-col gap-5 xl:w-[360px]">
          <AdminCard title="Cover Image">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-admin-border px-4 py-10 text-center">
              <Upload size={22} className="text-admin-text-tertiary" />
              <span className="text-[13px] text-admin-text-secondary">
                Drop image here or click to upload
              </span>
              <span className="text-[11px] text-admin-text-tertiary">PNG, JPG, WebP · Max 5MB</span>
            </div>
          </AdminCard>

          <AdminCard title="Display Settings">
            {TOGGLES.map(({ label, description }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-admin-text">{label}</span>
                  <span className="text-[11px] text-admin-text-tertiary">{description}</span>
                </div>
                {/* Toggle — 44×24, padding 3, justified end, $accent */}
                <span className="flex h-6 w-11 items-center justify-end rounded-xl bg-accent p-[3px]">
                  <span className="size-[18px] rounded-full bg-white" />
                </span>
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <Field label="Display Order" defaultValue="1" />
              <span className="text-[11px] text-admin-text-tertiary">Lower = shown first</span>
            </div>
          </AdminCard>

          <AdminCard title="Extended Description">
            <p className="text-xs text-admin-text-tertiary">
              Shown on the project detail page. Supports markdown.
            </p>
            <Field
              label="Overview"
              textarea
              rows={6}
              placeholder="Write a detailed overview of the project, the problems it solves, and the technical decisions behind it..."
            />
          </AdminCard>
        </div>
      </div>
    </>
  )
}
