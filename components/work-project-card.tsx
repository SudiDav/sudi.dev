import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, ExternalLink } from 'lucide-react'
import { GithubIcon } from './brand-icons'
import { TechBadge } from './tech-badge'
import type { Project } from '@/lib/content.types'

/**
 * Design: "Work Project Card" — COLUMN, clip, fill $bg-card, 1px $border,
 * cornerRadius 8, outer shadow 0/4/16 #00000015. A 200px image area, then a
 * card body of padding 24 / gap 16: title Geist 20/700, year Geist Mono 11/500
 * in $accent, description Inter 14/1.6, three tags, then the links row.
 *
 * The links row is gap 12 with two pills — padding [8,14], gap 6, 1px $border,
 * cornerRadius 6, labels Inter 12/500 and 14px icons.
 */
export function WorkProjectCard({ project }: { project: Project }) {
  return (
    <article
      id={project.slug}
      className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-bg-card shadow-[0_4px_16px_#00000015] transition-colors hover:border-border-hover"
    >
      <div className="relative h-50 w-full bg-bg-elevated">
        <Image
          src={project.cover}
          alt={project.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-text-primary">{project.title}</h2>
          <ArrowUpRight size={18} className="shrink-0 text-text-tertiary" />
        </div>

        <p className="font-mono text-[11px] font-medium text-accent">{project.year}</p>

        <p className="text-sm leading-[1.6] text-text-secondary">{project.description}</p>

        <div className="flex flex-wrap gap-2">
          {project.tech.map((tech) => (
            <TechBadge key={tech} label={tech} />
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {project.links.github ? (
            <Link
              href={project.links.github}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
            >
              <GithubIcon size={14} />
              Source
            </Link>
          ) : null}
          {project.links.live ? (
            <Link
              href={project.links.live}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
            >
              <ExternalLink size={14} />
              Live Demo
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}
