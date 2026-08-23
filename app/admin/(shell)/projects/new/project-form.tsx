'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Upload, X, TriangleAlert } from 'lucide-react'
import { AdminCard } from '@/components/admin/admin-ui'
import { addProject, editProject } from '@/app/admin/actions'
import type { Project } from '@/lib/content.types'

/** Design: Work Page → "Filters". `All` is the no-filter option. */
const CATEGORIES = ['Web Apps', 'CLI Tools', 'Libraries', 'Open Source']

/** Design: "Display Settings" — two toggles, both on. */
const TOGGLES = [
  { label: 'Featured Project', description: 'Show on homepage' },
  { label: 'Show on Work Page', description: 'List in portfolio projects' },
]

const inputClass =
  'rounded-lg border border-admin-border bg-admin-input px-3.5 py-2.5 text-[13px] text-admin-text placeholder:text-admin-text-tertiary focus:border-accent focus:outline-none'

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  textarea?: boolean
  rows?: number
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-admin-text-secondary">
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      )}
    </div>
  )
}

/**
 * Shared by "Add New Project" and the edit route. Passing an existing project
 * switches it to update mode — same fields, same validation, different action.
 */
export function ProjectForm({
  canPublish,
  project,
}: {
  canPublish: boolean
  project?: Project
}) {
  const editing = Boolean(project)
  const router = useRouter()
  const [name, setName] = useState(project?.title ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [year, setYear] = useState(project?.year ?? '2026')
  const [category, setCategory] = useState(project?.category ?? CATEGORIES[0])
  const [cover, setCover] = useState(project?.cover ?? '')
  const [tech, setTech] = useState<string[]>(project?.tech ?? [])
  const [techDraft, setTechDraft] = useState('')
  const [liveUrl, setLiveUrl] = useState(project?.links?.live ?? '')
  const [githubUrl, setGithubUrl] = useState(project?.links?.github ?? '')
  const [caseStudy, setCaseStudy] = useState('')
  const [body, setBody] = useState(project?.body ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const addTech = () => {
    const value = techDraft.trim()
    if (!value || tech.includes(value)) return
    setTech([...tech, value])
    setTechDraft('')
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const input = {
        name,
        description,
        year,
        category,
        tech,
        cover,
        liveUrl,
        githubUrl,
        body: [body, caseStudy && `Case study: ${caseStudy}`].filter(Boolean).join('\n\n'),
      }
      const result = project
        ? await editProject(project.slug, input)
        : await addProject(input)
      if (result.ok) router.push('/admin/projects')
      else setError(result.error)
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-2 text-xs text-admin-text-tertiary">
            <Link href="/admin/projects" className="hover:text-admin-text">
              Projects
            </Link>
            <span>/</span>
            <span className="text-admin-text-secondary">{editing ? name : 'Add New Project'}</span>
          </nav>
          <h1 className="font-display text-[26px] font-bold text-admin-text">
            {editing ? 'Edit Project' : 'Add New Project'}
          </h1>
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
            onClick={submit}
            disabled={pending || !canPublish}
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Saving…' : editing ? 'Save Changes' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {!canPublish ? (
        <p className="flex items-center gap-2 rounded-lg bg-[#F59E0B15] p-3 text-[13px] text-admin-warning">
          <TriangleAlert size={14} />
          Saving is disabled — set GITHUB_TOKEN and GITHUB_REPO to publish from a deployed site.
        </p>
      ) : null}

      {error ? (
        <p className="flex items-center gap-2 rounded-lg bg-[#EF444415] p-3 text-[13px] text-admin-danger">
          <TriangleAlert size={14} />
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-7 xl:flex-row">
        <div className="flex flex-1 flex-col gap-5">
          <AdminCard title="Project Details">
            <Field
              label="Project Name *"
              value={name}
              onChange={setName}
              placeholder="e.g. CollabSync"
            />
            <Field
              label="Description *"
              value={description}
              onChange={setDescription}
              placeholder="Brief description of the project..."
              textarea
            />
            <div className="flex flex-col gap-4 sm:flex-row">
              <Field label="Year" value={year} onChange={setYear} />
              {/*
                Category is not in the design's form, but the Work page filters
                by it — without one, a new project cannot be filtered to.
              */}
              <div className="flex flex-1 flex-col gap-1.5">
                <label
                  htmlFor="field-category"
                  className="text-xs font-medium text-admin-text-secondary"
                >
                  Category
                </label>
                <select
                  id="field-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={inputClass}
                >
                  {CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-admin-text-secondary">Tech Stack</span>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-admin-border bg-admin-input p-2.5">
                {tech.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent-dim px-3 py-1 text-[11px] text-accent"
                  >
                    {item}
                    <button
                      type="button"
                      aria-label={`Remove ${item}`}
                      onClick={() => setTech(tech.filter((value) => value !== item))}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  aria-label="Add technology"
                  placeholder="Add technology..."
                  value={techDraft}
                  onChange={(event) => setTechDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                      event.preventDefault()
                      addTech()
                    }
                  }}
                  onBlur={addTech}
                  className="flex-1 bg-transparent text-xs text-admin-text placeholder:text-admin-text-tertiary focus:outline-none"
                />
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Links">
            <Field
              label="Live URL"
              value={liveUrl}
              onChange={setLiveUrl}
              placeholder="https://myproject.dev"
            />
            <Field
              label="GitHub Repository"
              value={githubUrl}
              onChange={setGithubUrl}
              placeholder="https://github.com/SudiDav/..."
            />
            <Field
              label="Case Study / Blog Post"
              value={caseStudy}
              onChange={setCaseStudy}
              placeholder="https://sudi.dev/blog/..."
            />
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
            {/*
              Uploading needs somewhere to put the file; this site has no asset
              store yet. Until it does, the field takes a path to an image
              already in /public so the card renders correctly.
            */}
            <Field
              label="Cover path"
              value={cover}
              onChange={setCover}
              placeholder="/images/generated-1784965527781.png"
            />
          </AdminCard>

          <AdminCard title="Display Settings">
            {TOGGLES.map(({ label, description: hint }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-admin-text">{label}</span>
                  <span className="text-[11px] text-admin-text-tertiary">{hint}</span>
                </div>
                <span className="flex h-6 w-11 items-center justify-end rounded-xl bg-accent p-[3px]">
                  <span className="size-[18px] rounded-full bg-admin-knob" />
                </span>
              </div>
            ))}
          </AdminCard>

          <AdminCard title="Extended Description">
            <p className="text-xs text-admin-text-tertiary">
              Shown on the project detail page. Supports markdown.
            </p>
            <Field
              label="Overview"
              value={body}
              onChange={setBody}
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
