import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { TechBadge } from './tech-badge'
import type { Project } from '@/lib/content.types'

/**
 * Design: "Project Card" as instantiated in Portfolio Homepage → Projects Grid.
 * COLUMN, padding 24, gap 16, fill $bg-card, 1px $border, cornerRadius 8.
 * The grid is a ROW, and each instance is width=fill_container — hence flex-1.
 *
 * The homepage instances carry a SHORTER blurb than the Work page's cards and
 * show two tags rather than three. Both are the design's own overrides.
 */
export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/work#${project.slug}`}
      className="group flex flex-1 flex-col gap-4 rounded-lg border border-border bg-bg-card p-6 transition-colors hover:border-border-hover"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-text-primary">{project.title}</h3>
        <ArrowUpRight size={18} className="shrink-0 text-text-tertiary" />
      </div>
      <p className="text-sm leading-[1.5] text-text-secondary">
        {project.shortDescription ?? project.description}
      </p>
      <div className="flex flex-wrap gap-2">
        {project.tech.slice(0, 2).map((tech) => (
          <TechBadge key={tech} label={tech} />
        ))}
      </div>
    </Link>
  )
}
